# WikiPron — dados do Wiktionary

- **Origem:** https://github.com/CUNY-CL/wikipron, pasta `data/scrape/tsv/`
- **Versão:** commit `d282e848a211` (2026-07-23), baixado em 2026-11-13
- **Arquivos:** versão `broad` (fonêmica) e `filtered` (só fones do inventário do idioma)

| Arquivo | Idioma | Variante |
|---|---|---|
| `spa_latn_ca_broad_filtered.tsv` | `es-ES` | Espanha (castelhano) |
| `spa_latn_la_broad_filtered.tsv` | `es-419` | América Latina |
| `fra_latn_broad_filtered.tsv` | `fr-FR` | — |
| `ita_latn_broad_filtered.tsv` | `it-IT` | — |
| `deu_latn_broad_filtered.tsv` | `de-DE` | — |
| `eng_latn_uk_broad_filtered.tsv` | `en-GB` | Reino Unido |
| `por_latn_bz_broad.tsv` | — | Brasil. **Só as palavras** são usadas, no léxico do português (modo texto misto, T3.2; ver [LEXICON.md](../../LEXICON.md)) |

## Licença e atribuição

- **Dados:** extraídos do [Wiktionary](https://www.wiktionary.org/) e mantidos sob **CC BY-SA 4.0** ([licença](https://creativecommons.org/licenses/by-sa/4.0/)). Crédito: *contribuidores do Wiktionary*, via WikiPron. Os arquivos derivados destes (intermediários e shards) são distribuídos sob a mesma licença.
- **Código do WikiPron:** Apache 2.0 ([LICENSE-code.txt](LICENSE-code.txt)). O código não é usado aqui; o arquivo acompanha os dados por completude.
- Referência: Lee, J. L. et al. (2020). *Massively multilingual pronunciation modeling with WikiPron*. LREC 2020.

## Limitação importante

Os TSV publicados **não têm marcas de tônica nem de sílaba**: zero `ˈ` em cerca de 615 mil linhas. Por idioma:

- **es, fr:** a tônica se deduz por regra (T3.4).
- **de:** o `de.txt` do ipa-dict tem tônica em 99% das linhas; o merge (T2.6) pode combinar as duas fontes.
- **it, en-GB:** **sem fonte de tônica por enquanto.** Decisão pendente; ver o PLANO-V2.

Importação: `pnpm --filter @falagringo/data import:wikipron` → `build/intermediate/{lang}/wikipron.tsv`.
