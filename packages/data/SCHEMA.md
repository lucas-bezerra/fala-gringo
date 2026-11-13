# Formato intermediário dos dicionários (v1)

Todo importador (T2.2–T2.5) grava neste formato. A normalização e o merge (T2.6) e o gerador de shards (T2.7) **só leem este formato**. Código: [src/schema.ts](src/schema.ts) e [src/tsv.ts](src/tsv.ts).

## Entrada

| Campo | Tipo | Regra |
|---|---|---|
| `word` | string | Grafia original, NFC. Mantém maiúsculas de nomes próprios. A busca usa `lookupKey()` (NFC + minúsculas do idioma) |
| `ipa` | string | NFC, **sem** `/ /` ou `[ ]`, **sem** vírgula. Mantém `ˈ ˌ .` quando a fonte tiver |
| `lang` | `Lang` | Tag BCP 47 com variante: `en-US`, `en-GB`, `es-ES`, `es-419`, `fr-FR`, `de-DE`, `it-IT`, `ja-JP`, `ko-KR`, `zh-CN`, `nl-NL`, `sv-SE` |
| `source` | `SourceId` | Precisa estar em [src/sources.ts](src/sources.ts), que espelha o [SOURCES.md](SOURCES.md) |
| `rank` | inteiro ≥ 0 | Ordem da pronúncia entre as variantes da mesma palavra, idioma e fonte. `0` = principal |
| `freq` | número ≥ 0, opcional | Ocorrências por milhão, quando a fonte informar |
| `kind` | `common` \| `proper`, opcional | `proper` = nome próprio (padrão: `common`) |

**Variantes de pronúncia** viram entradas separadas com `rank` crescente. Ex.: `a  /ˈeɪ/, /ə/` vira duas entradas, com `rank` 0 e 1.
**Variantes regionais** ficam no `lang` (`en-US` × `en-GB`), nunca no `rank`.

## Validação (`validateEntry`)

- **Erro** (a linha é descartada): campos vazios, tab ou quebra de linha, espaços nas pontas, texto fora de NFC, barras/colchetes ou vírgula no IPA, idioma não suportado, fonte não registrada, `rank`/`freq`/`kind` inválidos.
- **Aviso** (a linha é mantida): caractere fora do conjunto IPA esperado, como o hífen que aparece no `ko.txt`. O teste é feito sobre a forma NFD.

O conjunto de caracteres foi conferido contra os 6 dicionários de `raw/ipa-dict` (cerca de 1,4 milhão de pronúncias). O hífen do `ko.txt` gera aviso no dado bruto; o importador (T2.2) o converte em espaço.

## Arquivo TSV

Um arquivo por idioma e fonte, em `build/intermediate/{lang}/{source}.tsv`:

```
#falagringo-intermediate v1
#lang en-US
#source cmudict
word	ipa	rank	freq	kind
a	ˈeɪ	0	21000.5
a	ə	1
Worcester	ˈwʊstɚ	0		proper
```

`parseTsv()` devolve as entradas válidas e a lista de problemas com o número da linha. `serializeTsv()` recusa entradas de outro idioma ou fonte.

## Mudanças de formato

Qualquer mudança incompatível incrementa a versão no cabeçalho (`v1` → `v2`) e é registrada aqui.
