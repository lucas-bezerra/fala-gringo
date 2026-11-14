"""Passo 2 — treina o modelo G2P de um idioma.

    python train.py --lang en-US                       # usa a GPU se houver
    python train.py --lang en-US --resume              # continua de runs/{lang}/last.pt
    python train.py --lang en-US --epochs 2 --limit 2000   # teste rápido do ambiente

Saídas em runs/{lang}/: best.pt (melhor validação), last.pt (para continuar), log.tsv.
Ctrl+C interrompe com segurança: o last.pt é salvo e dá para continuar com --resume.
"""

from __future__ import annotations

import argparse
import math
import random
import time
from pathlib import Path

import torch
from torch import nn

from common import BOS, EOS, PAD, ROOT, Vocab, read_tsv, utf8_console
from model import G2P


def pick_device(name: str) -> torch.device:
    if name != "auto":
        return torch.device(name)
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def pad(seqs: list[list[int]], device) -> torch.Tensor:
    width = max(len(s) for s in seqs)
    return torch.tensor([s + [PAD] * (width - len(s)) for s in seqs], dtype=torch.long, device=device)


def batches(pairs, batch_size: int, shuffle: bool):
    """Agrupa palavras de tamanho parecido (menos preenchimento = treino mais rápido)."""
    idx = list(range(len(pairs)))
    if shuffle:
        random.shuffle(idx)
    chunk = batch_size * 50
    out = []
    for c in range(0, len(idx), chunk):
        part = sorted(idx[c : c + chunk], key=lambda i: len(pairs[i][0]))
        out += [part[i : i + batch_size] for i in range(0, len(part), batch_size)]
    if shuffle:
        random.shuffle(out)
    return out


def evaluate(model: G2P, src_vocab: Vocab, tgt_vocab: Vocab, rows, device, batch_size=512) -> float:
    """Taxa de erro por palavra (%): errada se a previsão não bate com nenhuma variante."""
    model.eval()
    wrong = 0
    for i in range(0, len(rows), batch_size):
        chunk = rows[i : i + batch_size]
        src = pad([src_vocab.encode(r[0]) + [EOS] for r in chunk], device)
        for r, ids in zip(chunk, model.greedy(src)):
            wrong += tgt_vocab.decode(ids) not in r[1:]
    model.train()
    return 100 * wrong / max(1, len(rows))


def main() -> None:
    utf8_console()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True)
    ap.add_argument("--data", type=Path, help="padrão: tools/g2p/data/{lang}")
    ap.add_argument("--out", type=Path, help="padrão: tools/g2p/runs/{lang}")
    ap.add_argument("--epochs", type=int, default=80)
    ap.add_argument("--batch", type=int, default=256)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--warmup", type=int, default=2000, help="passos de aquecimento do learning rate (no máximo 10%% do treino)")
    ap.add_argument("--d-model", type=int, default=192)
    ap.add_argument("--heads", type=int, default=4)
    ap.add_argument("--layers", type=int, default=3, help="camadas no codificador e no decodificador")
    ap.add_argument("--ff", type=int, default=768)
    ap.add_argument("--dropout", type=float, default=0.1)
    ap.add_argument("--eval-every", type=int, default=2, help="épocas entre validações")
    ap.add_argument("--patience", type=int, default=10, help="validações sem melhora até parar")
    ap.add_argument("--limit", type=int, help="usa só N palavras de treino (teste rápido)")
    ap.add_argument("--device", default="auto", help="auto, cuda, cpu ou mps")
    ap.add_argument("--seed", type=int, default=13)
    ap.add_argument("--resume", action="store_true")
    args = ap.parse_args()

    data = args.data or ROOT / "data" / args.lang
    out = args.out or ROOT / "runs" / args.lang
    out.mkdir(parents=True, exist_ok=True)
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = pick_device(args.device)

    train_rows = read_tsv(data / "train.tsv")
    dev_rows = read_tsv(data / "dev.tsv")
    if args.limit:
        train_rows, dev_rows = train_rows[: args.limit], dev_rows[: max(200, args.limit // 10)]
    dev_eval = dev_rows[:3000]  # validação rápida; o teste completo fica no evaluate.py

    if args.resume:
        ckpt = torch.load(out / "last.pt", map_location=device, weights_only=False)
        src_vocab, tgt_vocab = Vocab(ckpt["src_vocab"][4:]), Vocab(ckpt["tgt_vocab"][4:])
        model = G2P(**ckpt["config"]).to(device)
        model.load_state_dict(ckpt["model"])
    else:
        src_vocab = Vocab.build(r[0] for r in train_rows)
        tgt_vocab = Vocab.build(r[1] for r in train_rows)
        model = G2P(len(src_vocab), len(tgt_vocab), d_model=args.d_model, heads=args.heads,
                    enc_layers=args.layers, dec_layers=args.layers, ff=args.ff, dropout=args.dropout).to(device)
        ckpt = None

    pairs = [(src_vocab.encode(r[0]) + [EOS], [BOS] + tgt_vocab.encode(r[1]) + [EOS]) for r in train_rows]
    steps_per_epoch = math.ceil(len(pairs) / args.batch)
    total = steps_per_epoch * args.epochs
    warmup = min(args.warmup, max(1, total // 10))  # testes curtos não passam o treino todo aquecendo
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, betas=(0.9, 0.98), weight_decay=0.01)

    def lr_at(step: int) -> float:
        if step < warmup:
            return (step + 1) / warmup
        progress = (step - warmup) / max(1, total - warmup)
        return max(0.02, 0.5 * (1 + math.cos(math.pi * min(1.0, progress))))

    sched = torch.optim.lr_scheduler.LambdaLR(opt, lr_at)
    loss_fn = nn.CrossEntropyLoss(ignore_index=PAD, label_smoothing=0.1)
    start_epoch, best, stale, step = 1, float("inf"), 0, 0
    if ckpt:
        opt.load_state_dict(ckpt["opt"])
        sched.load_state_dict(ckpt["sched"])
        start_epoch, best, stale, step = ckpt["epoch"] + 1, ckpt["best"], ckpt["stale"], ckpt["step"]

    params = sum(p.numel() for p in model.parameters())
    print(f"{args.lang}: {len(pairs)} palavras de treino, {len(dev_rows)} de validação; "
          f"{params / 1e6:.2f} M parâmetros; dispositivo {device}")
    if device.type == "cuda":
        print(f"  GPU: {torch.cuda.get_device_name(0)}")

    def save(path: Path, epoch: int) -> None:
        torch.save({"model": model.state_dict(), "config": model.config, "src_vocab": src_vocab.itos,
                    "tgt_vocab": tgt_vocab.itos, "opt": opt.state_dict(), "sched": sched.state_dict(),
                    "epoch": epoch, "best": best, "stale": stale, "step": step, "lang": args.lang,
                    "args": vars(args) | {"data": str(data), "out": str(out)}}, path)

    log = (out / "log.tsv").open("a", encoding="utf-8")
    if not args.resume:
        log.write("época\tperda\terro_validação_%\tsegundos\n")
    epoch = start_epoch - 1
    try:
        for epoch in range(start_epoch, args.epochs + 1):
            t0, total_loss = time.time(), 0.0
            model.train()
            for b in batches(pairs, args.batch, shuffle=True):
                src = pad([pairs[i][0] for i in b], device)
                tgt = pad([pairs[i][1] for i in b], device)
                logits = model(src, tgt[:, :-1])
                loss = loss_fn(logits.reshape(-1, logits.shape[-1]), tgt[:, 1:].reshape(-1))
                opt.zero_grad(set_to_none=True)
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                opt.step()
                sched.step()
                step += 1
                total_loss += loss.item()
            avg = total_loss / steps_per_epoch
            err = ""
            if epoch % args.eval_every == 0 or epoch == args.epochs:
                wer = evaluate(model, src_vocab, tgt_vocab, dev_eval, device)
                err = f"{wer:.2f}"
                if wer < best:
                    best, stale = wer, 0
                    save(out / "best.pt", epoch)
                else:
                    stale += 1
            secs = time.time() - t0
            print(f"época {epoch:3d}  perda {avg:.4f}  erro validação {err or '—':>6}%  "
                  f"melhor {best if best < float('inf') else float('nan'):.2f}%  {secs:.0f}s")
            log.write(f"{epoch}\t{avg:.4f}\t{err}\t{secs:.0f}\n")
            log.flush()
            save(out / "last.pt", epoch)
            if stale >= args.patience:
                print(f"Sem melhora em {args.patience} validações: parando.")
                break
    except KeyboardInterrupt:
        print("\nInterrompido. Salvando last.pt; continue com --resume.")
        save(out / "last.pt", max(epoch - 1, 0))
    finally:
        log.close()
    print(f"Melhor erro de validação: {best:.2f}% → {out / 'best.pt'}")


if __name__ == "__main__":
    main()
