# Desempenho — orçamento (T6.3)

As metas valem para o pior caso realista: **celular médio, primeira visita, cache vazio**. É o perfil "mobile" do Lighthouse: CPU 4× mais lenta, rede de 1,6 Mbps com 150 ms de latência. Tudo é medido no CI a cada PR.

## Metas e medições (2026-11-14)

| Métrica | Medido | Meta | Onde |
|---|--:|--:|---|
| LCP (maior elemento visível) | 1,18 s | 2,5 s ("bom" no Core Web Vitals) | `e2e/desempenho.spec.ts` |
| 1ª conversão (da navegação ao 1º cartão, cache vazio) | 3,1 s | 4 s | idem |
| Trocar um texto de 2.000 caracteres (inclui 250 ms de espera da digitação) | 0,5 s | 1,2 s | idem |
| Maior travada da tela ao digitar com o motor trabalhando | 0 ms | 100 ms (num aparelho médio) | idem |
| JS inicial (gzip) | 84,8 KB | 100 KB | `pnpm budget` |
| CSS inicial (gzip) | 6,8 KB | 15 KB | idem |
| Worker do motor (gzip) | 11,9 KB | 25 KB | idem |
| Service worker (gzip) | 6,2 KB | 30 KB | idem |
| Maior shard do dicionário (gzip) | 43,5 KB | 50 KB | idem |

Os valores medidos aparecem no log do CI (linhas `[desempenho]` e a tabela do `pnpm budget`).

## O que mudou para cumprir as metas

| Problema medido | Antes | Correção | Depois |
|---|--:|---|--:|
| A frase de exemplo caía em 3 shards de ~170 KB: 500 KB só para seis palavras | 4,6 s (1ª conversão) | Shards de até **48 KB** ([SHARDS.md](../packages/data/SHARDS.md)). O total por idioma não muda | 3,1 s |
| O worker só nascia na 1ª conversão, depois da espera de 250 ms da digitação | — | O worker e o manifest carregam em paralelo com o React (`warmUpEngine`), e a 1ª conversão sai sem espera | incluído acima |
| As abas renderizavam as duas listas (Sílabas e Corrido), com ~350 cartões cada | ~2,4 s (2.000 caracteres) | Só a aba ativa é renderizada | 0,5 s |

## Por que não o Lighthouse CI

O plano previa o Lighthouse. As mesmas métricas foram implementadas com o Chromium do Playwright, que já roda no CI, aplicando o mesmo perfil de rede e CPU via CDP. Isso evita uma dependência grande (Chrome próprio, `@lhci/cli`) e permite medir o que o Lighthouse não mede: a conversão de 2.000 caracteres e as travadas durante a digitação. Se precisarmos da nota do Lighthouse (por exemplo, para comparar com outros sites), dá para rodá-lo à mão no DevTools contra o `pnpm preview`.

## Ao mudar algo

- **Dependência nova no app:** rode `pnpm build && pnpm budget`. Se o JS inicial passar de 100 KB, carregue sob demanda (`import()`) o que não for da tela inicial.
- **Mudou o tamanho dos shards:** meça de novo a 1ª conversão. Shards maiores pioram o primeiro uso; menores demais aumentam o número de requisições.
- **Ajustar uma meta:** só com medição, e registre aqui o motivo.
