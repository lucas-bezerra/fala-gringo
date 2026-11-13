# Wiktionary (via wiktextract / kaikki.org) — pronúncias com tônica

Fonte de tônica para **it-IT** e **en-GB**, que o WikiPron entrega sem tônica. Decisão em [ADR 0001](../../../../docs/adr/0001-fonte-de-tonica.md).

- **Origem:** kaikki.org, arquivos por idioma `kaikki.org-dictionary-Italian.jsonl.gz` e `kaikki.org-dictionary-English.jsonl.gz`, extraídos em 2026-10-30 do dump do Wiktionary em inglês de 2026-10-01. Baixados em 2026-11-13.
- **Neste repositório ficam só os TSV compactos** (`palavra<TAB>ipa`), gerados por `extract:wiktextract`. Os JSONL (77 MB e 534 MB comprimidos) **não** entram.
- **Licença:** o kaikki.org não declara licença. Os dados são extraídos do [Wiktionary](https://www.wiktionary.org/) e herdam a **CC BY-SA 4.0** ([licença](https://creativecommons.org/licenses/by-sa/4.0/)). Crédito: *contribuidores do Wiktionary*, via [kaikki.org](https://kaikki.org). Os arquivos derivados são distribuídos sob a mesma licença.
- **Citação pedida pelo autor:** Tatu Ylonen, *Wiktextract: Wiktionary as Machine-Readable Structured Data*, LREC 2022, pp. 1317–1325.

## Critérios de extração

- Só transcrições **fonêmicas** (`/…/`). As estreitas (`[…]`) são descartadas.
- São descartados fragmentos (`/-di/`), alternativas compactadas com `~` e afixos (`-ità`). Segmentos opcionais `( )` e `₍ ₎` são removidos.
- **en-GB:** só etiquetas exclusivamente `Received-Pronunciation` e/ou `UK`. Ficam fora as regionais, as qualificadas (dated, rare, dialectal…) e a "British Southern Standard".

## Resultado

| Arquivo | Pronúncias | Entradas válidas | Palavras | Polissílabas com tônica |
|---|---|---|---|---|
| `it-IT.tsv` | 113.708 | 95.960 | 86.842 | 99,9% |
| `en-GB.tsv` | 59.188 | 42.678 | 36.441 | ~95% |

Para atualizar: baixe os `.jsonl.gz` e rode `pnpm --filter @falagringo/data extract:wiktextract <it-IT|en-GB> <arquivo>`. Se o kaikki remover os arquivos por idioma, use o `raw-wiktextract-data.jsonl.gz`; o script filtra por `lang_code`.
