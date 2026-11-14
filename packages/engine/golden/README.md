# Como revisar os golden sets

Estes arquivos são o **gabarito** do FalaGringo: para cada palavra, a grafia que um falante de português deve ler. O motor é medido contra eles (`pnpm test:golden`; resultado em [GOLDEN.md](../GOLDEN.md)).

## O que revisar

Cada arquivo `{idioma}.tsv` tem uma linha por palavra:

| Coluna | O que é |
|---|---|
| `palavra` | A palavra no idioma de origem |
| `ipa` | A pronúncia na fonte (não precisa mexer) |
| `esperado` | **A grafia para o leitor brasileiro.** Sílabas separadas por `·`; sílaba tônica em MAIÚSCULAS |
| `situação` | `rascunho` (preenchido pelo motor, ainda não conferido) ou `revisado` (conferido por você) |
| `observação` | Comentário livre: dúvida, motivo da correção, variante regional |

**Só as linhas `revisado` contam** na medição.

## Passo a passo

1. Abra o arquivo numa planilha (Excel, Google Planilhas ou LibreOffice). Formato: **separado por tabulação**, codificação **UTF-8**.
2. Para cada linha `rascunho`, leia o `esperado` em voz alta como um brasileiro leria. Se soa como a palavra original:
   - mantenha o texto e troque `situação` para `revisado`.
3. Se não soa certo:
   - corrija o `esperado`;
   - troque `situação` para `revisado`;
   - explique a correção em `observação`.
4. Salve no **mesmo formato** (TSV, UTF-8) e envie o arquivo para a equipe.

## Regras de escrita

Siga a notação em [docs/notacao.md](../../../docs/notacao.md), principalmente as seções 3 e 4:
- todo `e`/`o` leva acento (`ê`/`é`, `ô`/`ó`);
- `â` para a vogal reduzida;
- `rr`/`ss` onde o português leria outro som;
- sem tônica em japonês e coreano.

Na dúvida, escreva a sua leitura e explique em `observação`: a dúvida também é informação útil.

## Para a equipe

- Acrescentar rascunhos com as palavras mais frequentes de cada idioma: `pnpm --filter @falagringo/engine golden:draft` (precisa dos dados mesclados). O comando nunca altera linhas existentes.
- As metas de acerto por idioma ficam em [metas.json](metas.json). Elas só valem com pelo menos `minimoRevisadas` linhas revisadas. O CI falha se um idioma com meta ficar abaixo dela.
