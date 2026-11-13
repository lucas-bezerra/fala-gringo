# Britfone

- **Origem:** https://github.com/JoseLlarena/Britfone — `britfone.main.3.0.1.csv`
- **Versão:** 3.0.1, commit `1062be14adc9` (2017-10-02), baixado em 2026-11-13
- **Licença:** MIT, © 2017 Jose Llarena — texto integral em [LICENSE.txt](LICENSE.txt), que deve acompanhar qualquer redistribuição
- **Conteúdo:** inglês britânico (RP/SSB), cerca de 16 mil entradas, incluindo as 10 mil palavras mais frequentes, **com tônica**
- **Importação:** `pnpm --filter @falagringo/data import:britfone` → `build/intermediate/en-GB/britfone.tsv`

A tônica vem grudada na vogal (`w ˈɔː t ə`). O importador a move para o início da sílaba ([src/importers/englishStress.ts](../../src/importers/englishStress.ts)), a mesma lógica usada no CMUdict.
