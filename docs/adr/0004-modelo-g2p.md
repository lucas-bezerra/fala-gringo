# ADR 0004 — Modelo G2P para palavras fora do dicionário

- **Data:** 2026-11-14
- **Situação:** aceita como **experimento local**. O uso no site publicado depende da revisão de governança (abaixo).
- **Tarefa:** T3.9

## Contexto

Sem estimativa, uma palavra fora do dicionário aparece só com o aviso "fora do dicionário". Isso acontece muito com nomes novos no noticiário (pessoas, cidades, marcas), que são justamente o caso de uso do apresentador.

Opções avaliadas:
- **regras de grafia → som:** frágeis no inglês, que tem ortografia irregular;
- **LLM ou API paga:** custo, envio do texto para fora e resultado não reprodutível;
- **modelo G2P pequeno, treinado localmente** com os dicionários já liberados e executado no navegador.

A direção escolhida em 2026-11-13 foi o modelo G2P: custo zero, sem servidor e sem enviar o texto a ninguém.

## Decisão

1. **Modelo:** Transformer codificador-decodificador por caractere (pre-LN, d=192, 3+3 camadas, ~3,1 M parâmetros). Escrito à mão em `tools/g2p/model.py`, para cada peso ter nome e forma óbvios. Um modelo por idioma, treinado só com fontes do [SOURCES.md](../../packages/data/SOURCES.md). O 1º treino foi num MacBook M1 Pro (GPU via MPS), em ~2 h 10 min para três idiomas ([treino-g2p.md](../treino-g2p.md)).
2. **Formato:** `g2p.json` (configuração, vocabulários, índice dos tensores, dados e métricas do treino, que servem de documentação do modelo) + `g2p.bin` (pesos float16, ~6,3 MB). Os modelos **não vão para o git**.
3. **Inferência em TypeScript puro** (`packages/engine/src/g2p/`), sem WASM, sem dependência e sem DOM. Ela **reproduz o PyTorch exatamente**: 900/900 fixtures dos modelos reais, e o modelo minúsculo de `packages/engine/fixtures/g2p-tiny/` confere isso no CI. A decodificação é gulosa, com cache das chaves e valores da autoatenção.
4. **No motor**, o `Estimator` pode ser assíncrono. Só as palavras que ficaram sem pronúncia passam pelo modelo: português (texto misto) e partes conhecidas de compostos, não. O resultado é marcado `origin: 'estimated'`. Se o modelo falhar, a palavra volta a "fora do dicionário" e a conversão continua.
5. **Na tela:**
   - o cartão leva o selo "estimado";
   - o detalhe avisa que a pronúncia foi estimada **por um modelo de inteligência artificial** e pede confirmação antes de usar no ar;
   - no apresentador, a leitura leva "≈" e a legenda explica. O leitor de tela ouve "pronúncia estimada, confirme".
6. **No site, só sob opção:** `pnpm dev:g2p` publica os modelos locais em `/dict/` (nome com hash, anunciados no `manifest.json`). `pnpm dev`, `pnpm build`, o CI e o Render não os têm, então o site publicado continua sem estimativa.

## Resultado (2026-11-14)

Palavras de teste, que o modelo nunca viu. "Grafia PT-BR" é a forma silabada com a tônica, como a tela mostra, comparada com a grafia de qualquer pronúncia do dicionário. Detalhes e exemplos em [packages/engine/G2P.md](../../packages/engine/G2P.md).

| Idioma | Palavras de teste | IPA idêntico | **Grafia PT-BR** | Sem tônica | ms/palavra (M1 Pro) |
|---|--:|--:|--:|--:|--:|
| en-US | 6.206 | 71,1% | **74,4%** | 76,6% | 34 |
| en-GB | 2.893 | 44,2% | **67,9%** | 71,9% | 35 |
| fr-FR | 4.165 | 95,7% | **95,8%** | 95,9% | 35 |

**Leitura:**
- No **en-GB**, a notação do Wiktionary varia (pontos de sílaba, `a`/`æ`, `ɹ`/`r`), e o IPA idêntico subestima o modelo: passando pelo motor, o acerto vai de 44% para 68%.
- No **inglês**, os erros que sobram são, em boa parte, vogais reduzidas (`â`/`i`), tônica de nomes estrangeiros (`abacha`, `abuladze`) e palavras com mais de uma leitura no dicionário. Uma em cada quatro estimativas difere do dicionário, por isso a marca "estimado" e o pedido de confirmação são obrigatórios.
- No **francês**, a ortografia regular deixa o modelo quase sempre certo. As falhas são letras finais mudas ou pronunciadas (`absolus`, `angélus`).

## Consequências

- Nomes novos ganham uma leitura plausível em vez de nada, sempre marcada como estimada.
- **Velocidade:** ~35 ms por palavra num M1 Pro (no celular médio, ~4× mais). Cada palavra é estimada uma vez e guardada num LRU. O JavaScript escalar está perto do limite (~1,3 GMAC/s); ganhos grandes exigiriam um modelo menor.
- **Tamanho:** 6,3 MB por idioma, baixados na primeira palavra fora do dicionário. É aceitável em desenvolvimento, mas pesado demais para o celular (~30 s a 1,6 Mbps), e a conversão espera o download.
- **Manutenção:** mudar `model.py` exige mudar junto o `export.py` e `src/g2p/model.ts` e gerar as fixtures de novo. O teste falha se divergirem.

## Antes de ativar no site publicado

1. **Governança (Política de Uso Ético e Seguro de IA):**
   - Idea Case e classificação de risco. Sugestão: **baixo**, porque não usa dados pessoais, roda no navegador e só estima pronúncias, sempre marcadas;
   - a documentação do modelo (o `g2p.json` + este ADR);
   - revisão humana antes de qualquer uso no ar.
2. **Licenças:**
   - **en-US:** o modelo foi treinado só com CMUdict (BSD-2) e Wikidata (CC0), sem pendência além do crédito ao CMUdict.
   - **en-GB e fr-FR:** usam dados do Wiktionary (via kaikki e WikiPron, CC BY-SA 4.0). Publicar pesos treinados com esses dados precisa de análise (atribuição e compartilhamento pela mesma licença), ou de um novo treino só com fontes permissivas (`prepare.py --sources`).
3. **Tamanho e espera:** quantizar para int8 ou treinar um modelo menor, e não bloquear a conversão durante o download (mostrar "fora do dicionário" e atualizar quando o modelo chegar). Medir de novo com `e2e/desempenho.spec.ts`.
4. **Offline:** o service worker guarda os `.json` de `/dict/`, mas não o `.bin`. Decidir se o modelo entra no pacote offline.

Problemas como erro grave, viés ou uso indevido devem ser reportados a governanca@redegazeta.com.br.
