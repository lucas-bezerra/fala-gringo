# Wikidata — nomes próprios (P898)

- **Origem:** https://query.wikidata.org (SPARQL), propriedade **P898** (transcrição IPA) em itens `Q…`, com o qualificador **P407** (idioma) e o rótulo nesse idioma
- **Licença:** **CC0** (domínio público) — https://www.wikidata.org/wiki/Wikidata:Licensing. Não há obrigação de crédito; damos crédito por cortesia.
- **Retrato:** `p898.tsv` (versionado). A data está no histórico do git. Para atualizar: `pnpm --filter @falagringo/data fetch:wikidata`
- **Importação:** `pnpm --filter @falagringo/data import:wikidata` → `build/intermediate/{lang}/wikidata.tsv`

Colunas: `qid  code  label  ipa  human  place  club`. A importação mantém só **pessoas** (`P31 = Q5`), **lugares** (com coordenadas, `P625`) e **clubes/times**. Todas as entradas saem com `kind: proper`.

Observações:
- Cerca de 350 mil transcrições P898 do Wikidata são **formas de lexemas** (`L…-F…`), palavras comuns. Elas não entram aqui.
- `es` sem região: com `/θ/`, só es-ES; sem `/θ/`, vale para es-ES e es-419. `en` sem região: en-US (variante padrão do projeto).
- A consulta busca primeiro os itens com P898 e depois os rótulos e tipos em lotes de 200. Juntar tudo numa consulta só estoura o limite de 60 s do serviço.

## Retrato de 2026-11-13

- 1.605 transcrições com idioma e rótulo, das quais **695 entradas** são pessoas, lugares ou clubes. As outras 891 são povos, obras, conceitos etc.
- Por idioma: en-US 403, fr-FR 89, de-DE 79, es-ES 32, it-IT 31, es-419 29, en-GB 10, nl-NL 9, sv-SE 4, zh-CN 3, ja-JP 3, ko-KR 3.
- O importador corrige erros comuns de cadastro: `:` → `ː`, hífen → espaço, delimitadores `\ \`. Também descarta IPA preenchido com ideogramas.
- **A cobertura é baixa.** O Wikidata registra poucas transcrições IPA de nomes próprios. Para a T5.8 (nomes próprios: esportes, política, cidades), será preciso complementar com outras fontes, como as entradas de nomes próprios do Wiktionary.
