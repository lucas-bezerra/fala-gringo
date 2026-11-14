"""Passo 4 — exporta o modelo para o navegador: dois arquivos estáticos, sem dependência de Python.

    python export.py --lang en-US                 # pesos em float16 (metade do tamanho)
    python export.py --lang en-US --dtype float32

Saídas em export/{lang}/:
  g2p.json     configuração, vocabulários, índice dos tensores (nome, forma, posição no .bin) e métricas
  g2p.bin      pesos, little-endian, na ordem do índice
  fixtures.tsv 300 palavras de teste com a saída do PyTorch usando os MESMOS pesos exportados;
               a inferência em TypeScript (etapa seguinte da T3.9) tem de reproduzir esta coluna exatamente
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date
from pathlib import Path

import numpy as np
import torch

from common import ROOT, read_tsv, utf8_console, write_json
from evaluate import load, predict
from train import pick_device


def main() -> None:
    utf8_console()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True)
    ap.add_argument("--model", type=Path, help="padrão: runs/{lang}/best.pt")
    ap.add_argument("--dtype", choices=["float16", "float32"], default="float16")
    ap.add_argument("--out", type=Path, help="padrão: export/{lang}")
    args = ap.parse_args()

    device = pick_device("cpu")
    model_path = args.model or ROOT / "runs" / args.lang / "best.pt"
    run = model_path.parent  # métricas e erros ficam ao lado do modelo
    model, src_vocab, tgt_vocab, ckpt = load(model_path, device)
    out = args.out or ROOT / "export" / args.lang
    out.mkdir(parents=True, exist_ok=True)

    # Arredonda os pesos para o tipo exportado ANTES de gerar as fixtures: assim elas refletem o arquivo final.
    np_dtype = np.float16 if args.dtype == "float16" else np.float32
    tensors, blobs, offset = [], [], 0
    with torch.no_grad():
        for name, t in model.state_dict().items():
            arr = t.detach().cpu().numpy().astype(np_dtype)
            t.copy_(torch.from_numpy(arr.astype(np.float32)))
            raw = arr.astype(arr.dtype.newbyteorder("<")).tobytes()
            tensors.append({"name": name, "shape": list(arr.shape), "offset": offset, "bytes": len(raw)})
            blobs.append(raw)
            offset += len(raw)
    weights = b"".join(blobs)
    (out / "g2p.bin").write_bytes(weights)

    test = read_tsv(ROOT / "data" / args.lang / "test.tsv")[:300]
    preds = predict(model, src_vocab, tgt_vocab, [r[0] for r in test], device)
    (out / "fixtures.tsv").write_text("palavra\tprevisto\n" + "".join(f"{r[0]}\t{p}\n" for r, p in zip(test, preds)),
                                      encoding="utf-8")

    metrics_path = run / "metrics.json"
    meta_path = ROOT / "data" / args.lang / "meta.json"
    manifest = {
        "format": "falagringo-g2p",
        "version": 1,
        "lang": args.lang,
        "created": date.today().isoformat(),
        "dtype": args.dtype,
        "bin_sha256": hashlib.sha256(weights).hexdigest(),
        "architecture": "transformer pre-LN, por caractere; ver tools/g2p/model.py",
        "config": {k: v for k, v in ckpt["config"].items() if k != "dropout"},
        "specials": {"pad": 0, "bos": 1, "eos": 2, "unk": 3},
        "src_vocab": src_vocab.itos,
        "tgt_vocab": tgt_vocab.itos,
        "tensors": tensors,
        "training": {
            "epoch": ckpt["epoch"],
            "args": {k: v for k, v in ckpt["args"].items() if k not in ("data", "out")},
            "data": json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else None,
            "test_metrics": json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else None,
        },
    }
    write_json(out / "g2p.json", manifest)
    params = sum(int(np.prod(t["shape"])) for t in tensors)
    print(f"{args.lang}: {params / 1e6:.2f} M parâmetros, {len(weights) / 1e6:.1f} MB ({args.dtype}) → {out}")
    if manifest["training"]["test_metrics"] is None:
        print("  aviso: rode evaluate.py antes, para as métricas irem no g2p.json")


if __name__ == "__main__":
    main()
