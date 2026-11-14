"""Passo 3 — mede o modelo no conjunto de teste (palavras que ele nunca viu) e testa palavras avulsas.

    python evaluate.py --lang en-US                       # teste completo + runs/{lang}/test-errors.tsv
    python evaluate.py --lang en-US --words zelenskyy brexit covfefe
"""

from __future__ import annotations

import argparse
from pathlib import Path

import torch

from common import EOS, ROOT, Vocab, edit_distance, nfc, read_tsv, utf8_console, write_json
from model import G2P
from train import pad, pick_device


def load(path: Path, device):
    ckpt = torch.load(path, map_location=device, weights_only=False)
    model = G2P(**ckpt["config"]).to(device)
    model.load_state_dict(ckpt["model"])
    model.eval()
    return model, Vocab(ckpt["src_vocab"][4:]), Vocab(ckpt["tgt_vocab"][4:]), ckpt


def predict(model, src_vocab, tgt_vocab, words: list[str], device, batch_size=512) -> list[str]:
    out = []
    for i in range(0, len(words), batch_size):
        src = pad([src_vocab.encode(w) + [EOS] for w in words[i : i + batch_size]], device)
        out += [tgt_vocab.decode(ids) for ids in model.greedy(src)]
    return out


def strip_stress(ipa: str) -> str:
    return ipa.replace("ˈ", "").replace("ˌ", "")


def main() -> None:
    utf8_console()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True)
    ap.add_argument("--model", type=Path, help="padrão: runs/{lang}/best.pt")
    ap.add_argument("--data", type=Path, help="padrão: data/{lang}")
    ap.add_argument("--words", nargs="+", help="só prevê estas palavras")
    ap.add_argument("--device", default="auto")
    args = ap.parse_args()

    device = pick_device(args.device)
    model_path = args.model or ROOT / "runs" / args.lang / "best.pt"
    run = model_path.parent  # métricas e erros ficam ao lado do modelo
    model, src_vocab, tgt_vocab, ckpt = load(model_path, device)

    if args.words:
        words = [nfc(w).lower() for w in args.words]
        for w, p in zip(words, predict(model, src_vocab, tgt_vocab, words, device)):
            print(f"{w}\t{p}")
        return

    rows = read_tsv((args.data or ROOT / "data" / args.lang) / "test.tsv")
    preds = predict(model, src_vocab, tgt_vocab, [r[0] for r in rows], device)
    wrong = wrong_seg = edits = chars = 0
    errors = []
    for r, p in zip(rows, preds):
        variants = r[1:]
        if p not in variants:
            wrong += 1
            errors.append(f"{r[0]}\t{p}\t{' | '.join(variants)}")
        if strip_stress(p) not in {strip_stress(v) for v in variants}:
            wrong_seg += 1
        edits += min(edit_distance(p, v) for v in variants)
        chars += len(variants[0])

    n = len(rows)
    metrics = {
        "lang": args.lang,
        "epoch": ckpt["epoch"],
        "test_words": n,
        "word_error_pct": round(100 * wrong / n, 2),
        "word_error_ignoring_stress_pct": round(100 * wrong_seg / n, 2),
        "char_error_pct": round(100 * edits / chars, 2),
    }
    (run / "test-errors.tsv").write_text("palavra\tprevisto\tdicionário\n" + "\n".join(errors) + "\n",
                                         encoding="utf-8")
    write_json(run / "metrics.json", metrics)
    print(f"{args.lang} — {n} palavras de teste (época {ckpt['epoch']})")
    print(f"  erro por palavra:                {metrics['word_error_pct']}%")
    print(f"  erro por palavra, sem a tônica:  {metrics['word_error_ignoring_stress_pct']}%")
    print(f"  erro por caractere do IPA:       {metrics['char_error_pct']}%")
    print(f"  erros listados em {run / 'test-errors.tsv'}")


if __name__ == "__main__":
    main()
