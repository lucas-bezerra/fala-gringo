# Merge das fontes (T2.6)

`pnpm --filter @falagringo/data merge` lê `build/intermediate/{lang}/{fonte}.tsv` e grava `build/merged/{lang}.tsv` (formato em [src/mergedTsv.ts](src/mergedTsv.ts)). Código: [src/merge.ts](src/merge.ts).

## Estratégia: precedência por palavra

Cada palavra recebe **todas as pronúncias da fonte de maior prioridade que a tenha**, e só dela. As outras fontes não somam variantes. Fontes com convenções diferentes, somadas, criariam "variantes" falsas, como `ɚ` × `ɝ` no en-US. As fontes que concordam com a pronúncia principal (mesmos segmentos) ficam na coluna `agree`, um indicador de confiança.

### Grafias diferentes da mesma chave

Uma fonte pode ter grafias que viram a mesma chave de busca, como `Die` /daɪ/ (empréstimo do inglês) e `die` /diː/ (artigo), no ipa-dict alemão. Cada uma tem seu rank 0. **A grafia idêntica à chave (minúscula) vem primeiro**, e as outras viram variantes. Antes dessa regra, valia a ordem do arquivo, e siglas e nomes capitalizados passavam na frente da palavra comum. Isso mudou a pronúncia principal de 781 palavras em de-DE e de menos de 200 por idioma nos demais.

### ⚠️ A ordem das variantes do WikiPron não é preferência

No WikiPron, a ordem das variantes é a **ordem da página do Wiktionary**. Exemplos:
- `petit` vem como `piti`, `pti`, `pəti`, …;
- `gimp` vem como `d͡ʒɪmp` antes de `ɡɪmp`;
- espanhol `la` vem como `a` antes de `la`.

Nos idiomas em que o WikiPron é a fonte principal (es, fr), a pronúncia principal pode ser uma variante regional ou ruído. A correção prevista é a regra de conversão do idioma (T5.1, T5.4) escolher a variante que concorda com ela.

## Prioridade por idioma

Regra geral: **fontes com tônica primeiro**. O WikiPron, sem tônica, só preenche lacunas.

| Idioma | Prioridade | Observação |
|---|---|---|
| en-US | cmudict › wikidata | **ipa-dict excluído**: cobre exatamente as mesmas 125.927 palavras do CMUdict, numa conversão mais antiga e com menos informação (`ɫ` em todo `l`, sem `ʌ`/`ɚ`) |
| en-GB | wiktextract › britfone › wikidata › wikipron | Tônica emprestada do en-US quando falta (ver abaixo) |
| de-DE | ipa-dict › wikidata › wikipron | O ipa-dict tem tônica em 99% |
| it-IT | wiktextract › wikidata › wikipron | — |
| es-ES, es-419, fr-FR | wikipron › wikidata | Tônica por regra no motor (T3.4) |
| ja-JP, ko-KR, nl-NL, sv-SE | ipa-dict › wikidata | — |
| zh-CN | wikidata | Só 3 nomes. O mandarim vem na T5.7 |

## Normalização (só convenções, nunca informação)

As decisões vieram da comparação dos inventários de símbolos entre fontes do mesmo idioma.

| Regra | Onde | Motivo |
|---|---|---|
| `g` → `ɡ`, `:` → `ː`, NFC | todas | Variantes tipográficas |
| `ɫ` → `l` | en-* | L escuro é alofone previsível em inglês |
| `ɐ` → `ʌ` | britfone | O Britfone escreve a vogal de *cup* como `ɐ`; o Wiktionary e o WikiPron, como `ʌ` |
| `ɚ` → `ə`, `ɝ` → `ɜː` | en-GB | ~3% do WikiPron "britânico" vem com o r rótico americano (`Acre` `eɪkɚ`). O britânico padrão não é rótico |
| **Mantidas:** ligaduras (`t͡ʃ`), `ˈ ˌ`, `.` | — | A notação usa: a ligadura distingue africada de encontro (`ts`); as sílabas ajudam a T3.4 |

A **comparação** entre fontes (`comparisonKey`) ignora também tônica, sílaba, espaço, ligadura, diacríticos de silábico/não silábico e a oclusiva glotal. São diferenças de convenção, como `ʔaːlə` × `ˈaːlə` no alemão.

## Tônica

Cada pronúncia sai com um status:

| Status | Significado |
|---|---|
| `marked` | A fonte traz `ˈ`/`ˌ` |
| `borrowed` | **Tônica emprestada de outra variante do idioma.** Confiança menor |
| `mono` | Monossílaba; dispensa marca |
| `none` | Polissílaba sem tônica; o motor aplica regra (T3.4) ou avisa |

**Empréstimo en-US → en-GB.** O WikiPron (sem tônica) é a única fonte de cerca de 40 mil palavras raras do en-GB. Quando a palavra existe no CMUdict **com o mesmo número de núcleos silábicos**:
1. copia-se o **padrão** de tônica (qual núcleo é forte), não os sons;
2. as marcas são reposicionadas no início da sílaba britânica pela regra de ataque máximo do inglês.

Isso levou o en-GB sem tônica de 41,5% para 30,3%. **Limitação conhecida:** onde as variantes acentuam sílabas diferentes (*garage*: US gəˈɹɑʒ × UK ˈɡæɹɑːʒ), o empréstimo copia a americana. Por isso o status é `borrowed`, e não `marked`.

A contagem de núcleos trata vogais contíguas como um núcleo (ditongos). Hiatos escritos sem `.` contam como 1. Por isso ela serve para decidir "precisa de tônica?" e para alinhar variantes, mas não para silabar.

## Resultado (2026-11-13)

| Idioma | Palavras | Pronúncias | Tônica marcada | Emprestada | Monossílabas | Sem tônica | Concordância* | Fonte escolhida |
|---|---|---|---|---|---|---|---|---|
| en-US | 126.313 | 135.433 | 100,0% | — | — | — | 14,0% (114) | cmudict 126.052, wikidata 261 |
| en-GB | 85.582 | 102.451 | 49,1% | 11,1% | 9,5% | 30,3% | 85,5% (38.891) | wikipron 40.523, wiktextract 35.988, britfone 9.066, wikidata 5 |
| de-DE | 789.141 | 843.949 | 97,3% | — | 1,2% | 1,5% | 74,8% (38.127) | ipa-dict 777.800, wikipron 11.298, wikidata 43 |
| it-IT | 85.991 | 95.117 | 99,9% | — | 0,1% | 0,0% | 95,5% (81.333) | wiktextract 85.953, wikipron 24, wikidata 14 |
| es-ES | 131.071 | 132.017 | — | — | 0,9% | 99,1% | — | wikipron 131.047, wikidata 24 |
| es-419 | 131.057 | 131.975 | — | — | 0,9% | 99,1% | — | wikipron 131.035, wikidata 22 |
| fr-FR | 84.444 | 96.241 | — | — | 6,7% | 93,3% | — | wikipron 84.370, wikidata 74 |
| ja-JP | 221.356 | 233.056 | — | — | 1,4% | 98,6%** | — | ipa-dict 221.353, wikidata 3 |
| ko-KR | 62.449 | 66.627 | 0,4% | — | 2,1% | 97,5%** | — | ipa-dict 62.447, wikidata 2 |
| nl-NL | 117.878 | 118.137 | 100,0% | — | — | — | — | ipa-dict 117.869, wikidata 9 |
| sv-SE | 21.099 | 21.757 | 88,8% | — | 10,6% | 0,6% | — | ipa-dict 21.095, wikidata 4 |
| zh-CN | 3 | 3 | — | — | — | 100% | — | wikidata 3 |

\* Palavras em que outra fonte concorda com a pronúncia principal, entre as que estão em mais de uma fonte; entre parênteses, quantas são. Com amostras pequenas (< 100), o percentual não diz nada.
\*\* Japonês e coreano não têm sílaba tônica (notação, seção 6). "Sem tônica" é o esperado.

**Total:** 1.976.763 pronúncias em 12 arquivos, todas relidas e validadas sem erro.

### Como ler a concordância

- **it-IT 95,5%:** o WikiPron e o Wiktionary vêm da mesma origem.
- **en-GB 85,5%:** o Wiktionary mantém vogais opcionais (`ɡəˈɹɑʒ`) que outras fontes omitem.
- **de-DE 74,8%:** sobram diferenças de convenção entre o ipa-dict e o WikiPron, como consoante silábica × schwa (`aːxn̩` × `aːxən`) e o comprimento vocálico. Vale investigar no golden set do alemão (T5.3).
- **en-US 14,0%:** só 114 palavras em comum com o Wikidata, que usa outras convenções (`r` × `ɹ`). A amostra não é representativa.
