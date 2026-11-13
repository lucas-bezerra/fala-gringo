# CMUdict

- **Origem:** https://github.com/cmusphinx/cmudict — arquivo `cmudict.dict`
- **Versão:** commit `74790861f652` (2025-10-24), baixado em 2026-11-13
- **Licença:** estilo BSD-2, © Carnegie Mellon University. Texto integral em [LICENSE](LICENSE), que **deve acompanhar** qualquer redistribuição.
- **Importação:** `pnpm --filter @falagringo/data import:cmudict` → `build/intermediate/en-US/cmudict.tsv`

A conversão ARPAbet → IPA ([src/importers/cmudict.ts](../../src/importers/cmudict.ts)) é fiel à fonte: não aplica processos fonéticos como o flap de "water". Esses processos ficam no perfil EN-US do motor (T3.7).

Comparação com o `en_US` do ipa-dict (que também deriva do CMUdict), feita em 2026-11-13:
- O ipa-dict usa `ɫ` em todo `l` e não distingue `ɝ`/`ɚ` nem `ʌ`/`ə`. A nossa conversão mantém essas distinções, que a notação usa.
- Neutralizando essas convenções, 97,1% das pronúncias principais coincidem, e praticamente todas as palavras têm alguma variante idêntica (o resíduo são algumas dezenas de casos).
- O resíduo são correções recentes do CMUdict (ex.: `chicagoan` /ʃ/, `chianti` /k/).
