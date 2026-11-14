"""Passo 1 — gera os conjuntos de treino, validação e teste a partir do dicionário mesclado.

Roda na máquina que tem o pipeline de dados (precisa de packages/data/build/merged/{idioma}.tsv, gerado por
`pnpm --filter @falagringo/data merge`). Não precisa de torch. Depois, copie a pasta data/{idioma}/ para o PC de treino.

    python prepare.py --lang en-US
    python prepare.py --lang en-US --sources cmudict           # só fontes de licença permissiva
"""

from __future__ import annotations

import argparse
import hashlib
import re
from collections import Counter
from datetime import date
from pathlib import Path

from common import REPO, ROOT, nfc, split_of, utf8_console, write_json

# Idiomas em que a tônica faz parte da palavra: só entram pronúncias com tônica no dado.
STRESS_LANGS = {"en-US", "en-GB", "de-DE", "nl-NL", "sv-SE", "it-IT", "es-ES", "es-419"}
WORD_RE = re.compile(r"^[^\W\d_]+(?:['’-][^\W\d_]+)*$")
MAX_WORD, MAX_IPA = 30, 40


def main() -> None:
    utf8_console()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", required=True, help="tag BCP 47, ex.: en-US")
    ap.add_argument("--merged", type=Path, help="TSV mesclado (padrão: packages/data/build/merged/{lang}.tsv)")
    ap.add_argument("--sources", help="lista separada por vírgula; só a pronúncia principal destas fontes entra")
    ap.add_argument("--out", type=Path, help="pasta de saída (padrão: tools/g2p/data/{lang})")
    args = ap.parse_args()

    merged = args.merged or REPO / "packages/data/build/merged" / f"{args.lang}.tsv"
    out = args.out or ROOT / "data" / args.lang
    allowed = set(args.sources.split(",")) if args.sources else None
    need_stress = args.lang in STRESS_LANGS

    lines = merged.read_text(encoding="utf-8").splitlines()
    if not lines[0].startswith("#falagringo-merged"):
        raise SystemExit(f"{merged} não é um TSV mesclado do FalaGringo")
    header = lines[2].split("\t")
    col = {name: i for i, name in enumerate(header)}

    prons: dict[str, list[str]] = {}
    source_of: dict[str, str] = {}
    skipped = Counter()
    for line in lines[3:]:
        row = line.split("\t")
        word, ipa = nfc(row[col["word"]]).lower(), nfc(row[col["ipa"]])
        source, stress = row[col["source"]], row[col["stress"]]
        if allowed and source not in allowed:
            skipped["fonte fora da lista"] += 1
            continue
        if not WORD_RE.match(word) or len(word) > MAX_WORD:
            skipped["grafia fora do padrão (espaço, dígito, símbolo) ou longa"] += 1
            continue
        if len(ipa) > MAX_IPA:
            skipped["IPA longo"] += 1
            continue
        if need_stress and stress == "none":
            skipped["sem tônica no dado"] += 1
            continue
        if word not in prons:
            prons[word] = []
            source_of[word] = source
        if ipa not in prons[word]:
            prons[word].append(ipa)  # a 1ª é a principal (ordem do merge)

    out.mkdir(parents=True, exist_ok=True)
    counts = Counter()
    files = {name: (out / f"{name}.tsv").open("w", encoding="utf-8", newline="") for name in ("train", "dev", "test")}
    try:
        for word in sorted(prons):
            part = split_of(word)
            counts[part] += 1
            # treino: só a principal (alvos consistentes); validação/teste: todas as variantes contam como certas
            variants = prons[word][:1] if part == "train" else prons[word]
            files[part].write(word + "\t" + "\t".join(variants) + "\n")
    finally:
        for f in files.values():
            f.close()

    meta = {
        "lang": args.lang,
        "created": date.today().isoformat(),
        "merged_sha256": hashlib.sha256(merged.read_bytes()).hexdigest()[:16],
        "sources": dict(Counter(source_of.values()).most_common()),
        "sources_filter": sorted(allowed) if allowed else None,
        "require_stress": need_stress,
        "counts": dict(counts),
        "skipped": dict(skipped),
    }
    write_json(out / "meta.json", meta)
    print(f"{args.lang}: {sum(counts.values())} palavras → {out}")
    for k, v in counts.items():
        print(f"  {k}: {v}")
    for k, v in skipped.most_common():
        print(f"  descartadas ({k}): {v}")
    print("  fontes:", ", ".join(f"{s} {n}" for s, n in meta["sources"].items()))


if __name__ == "__main__":
    main()
