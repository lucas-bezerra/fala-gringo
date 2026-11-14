"""Utilidades compartilhadas pelos scripts de treino do G2P (Python 3.12)."""

from __future__ import annotations

import hashlib
import json
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent

PAD, BOS, EOS, UNK = 0, 1, 2, 3
SPECIALS = ["<pad>", "<s>", "</s>", "<unk>"]


def utf8_console() -> None:
    """O console do Windows não usa UTF-8 por padrão; sem isto, imprimir IPA quebra."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        except (AttributeError, ValueError):
            pass


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def split_of(word: str) -> str:
    """Divisão determinística por palavra: a mesma palavra cai sempre no mesmo conjunto, em qualquer máquina."""
    bucket = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16) % 100
    return "train" if bucket < 90 else "dev" if bucket < 95 else "test"


class Vocab:
    """Vocabulário por caractere (code point após NFC). Os 4 primeiros índices são os especiais."""

    def __init__(self, symbols: list[str]):
        self.itos = SPECIALS + [s for s in symbols if s not in SPECIALS]
        self.stoi = {s: i for i, s in enumerate(self.itos)}

    @classmethod
    def build(cls, texts) -> "Vocab":
        return cls(sorted({ch for t in texts for ch in t}))

    def encode(self, text: str) -> list[int]:
        return [self.stoi.get(ch, UNK) for ch in text]

    def decode(self, ids) -> str:
        out = []
        for i in ids:
            if i == EOS:
                break
            if i >= len(SPECIALS):
                out.append(self.itos[i])
        return "".join(out)

    def __len__(self) -> int:
        return len(self.itos)


def read_tsv(path: Path) -> list[list[str]]:
    with path.open(encoding="utf-8", newline="") as f:
        return [line.rstrip("\n").split("\t") for line in f if line.strip()]


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]
