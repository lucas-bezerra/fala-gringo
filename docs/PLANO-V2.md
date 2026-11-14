# FalaGringo v2 — Plano de reconstrução

> Documento de trabalho. Cada tarefa traz o **effort** recomendado para executá-la com o Claude Code, para não gastar tokens de raciocínio onde não precisa.
> Protótipo navegável do frontend: https://claude.ai/artifact/68SFbsmQMLiwk4eQM99QFv. **A Fase 4 só começa depois que o protótipo for aprovado.**

---

## 1. Diagnóstico da v1 (resumo)

| Problema | Impacto |
|---|---|
| A conversão IPA → PT-BR troca caractere por caractere (no máximo 2) e não olha o contexto | Resultados errados ou ambíguos para quem lê em português. Exemplos: `ti`/`di` são lidos como "tchi"/"dji", o `r` inicial é lido como "h" e o `l` final como "u". |
| Não separa sílabas e não marca a tônica de forma legível (usa `'`) | O leitor não sabe onde fica o acento. |
| O usuário baixa o dicionário inteiro de uma vez (de 3 MB a 30 MB) dentro de um JSON | O primeiro uso é lento e estoura a cota do IndexedDB. |
| Palavra fora do dicionário aparece só como "?" | Nomes próprios e palavras novas ficam sem resposta. |
| Só `en_US` está ativo, e o japonês/chinês não são segmentados | Pouca cobertura. |
| O dev mode está quebrado, não há testes nem CI, e sobrou código do template do AI Studio | Difícil evoluir com segurança. |
| O Tailwind e o React vêm por CDN, e não há CSP | Superfície de ataque desnecessária e dependência de terceiros em tempo de execução. |

**Recomendação: reescrever, não refatorar.** A v1 tem cerca de 900 linhas, e o núcleo (a conversão) precisa mudar de modelo. Vamos aproveitar a tabela de mapeamentos e o texto das dicas como ponto de partida.

## 2. Objetivos da v2

1. **Mais acerto:** conversão por fonemas, com regras de contexto por idioma, sílabas e tônica explícitas, e testes com respostas esperadas revisadas por um especialista.
2. **Mais cobertura:** dicionários maiores, variantes regionais (EN-US/UK, ES/419), nomes próprios e uma estimativa para palavras fora do dicionário.
3. **Mais idiomas:** primeiro EN, ES, FR, IT e DE; depois JA, KO e ZH; o resto conforme a demanda.
4. **Mais segurança:** site 100% estático, sem backend, com CSP rígida, dependências auditadas e nenhum dado do usuário saindo do navegador.
5. **UX/UI de produto:** detalhe palavra a palavra explicando cada som, dicas que mudam conforme a frase, guia de sons, **modo apresentador** (para TV e rádio), uso offline e acessibilidade WCAG 2.2 AA.

## 3. Arquitetura proposta

```
fala-gringo/
├─ apps/web/            React 19 + Vite + Tailwind v4 + PWA (vite-plugin-pwa)
├─ packages/engine/     motor fonético em TS puro (sem DOM) — roda num Web Worker
│   ├─ tokenize/        Intl.Segmenter, números, texto misto PT + estrangeiro
│   ├─ ipa/             parser de IPA → fonemas, silabação, tônica
│   ├─ rules/           motor de regras contextuais + perfis por idioma
│   ├─ g2p/             estimativa para palavras fora do dicionário (regras por idioma)
│   └─ render/          saída ortográfica PT-BR
├─ packages/data/       pipeline Node: baixa as fontes, normaliza e gera shards
├─ packages/content/    dicas, guia de sons e textos de ajuda (JSON/MDX)
└─ docs/                especificação da notação, ADRs, este plano
```

**Fluxo:** o texto entra no worker. O worker segmenta o texto e, para cada palavra, busca no shard do dicionário (baixado sob demanda e guardado em cache pelo Service Worker). Se a palavra não estiver lá, usa o G2P. Em seguida vêm o parser de IPA, a silabação, as regras do perfil do idioma e a renderização em PT-BR. O resultado é estruturado: sílabas, tônica, sons especiais, origem (dicionário ou estimado) e variantes.

**Dados:** cada idioma vira `/dict/{lang}/{prefixo}.{hash}.json` mais um `manifest.json`. A tela pede só os shards das palavras digitadas, e o botão "baixar para offline" busca todos.

**Sem backend.** O site vai para hospedagem estática com CDN. Isso elimina o Express, o rate limit e o risco de path traversal.

### Notação PT-BR (proposta — validar na T0.3)

| Regra | Exemplo |
|---|---|
| Sílabas separadas por `·`; a tônica em MAIÚSCULAS | `VÉ·ri` (very) |
| Acento gráfico para indicar vogal aberta/fechada | `é` aberto, `ê` fechado, `â` para o schwa e o ʌ |
| Evitar a palatalização brasileira de `ti`/`di` | espanhol `donde` → `DÔN·dê`, não `dondi` |
| Som sem equivalente em PT-BR fica destacado e linka uma explicação | `θ` em *think* → `f` destacado, com "língua entre os dentes" |
| Palavra fora do dicionário recebe o selo **estimado** | — |

## 4. Fontes de dados (verificadas na T0.2 — detalhes em [packages/data/SOURCES.md](../packages/data/SOURCES.md))

| Fonte | Uso | Licença |
|---|---|---|
| CMUdict / cmudict-ipa | EN-US | BSD-2 / MIT |
| Britfone | EN-UK | MIT |
| WikiPron (dados do Wiktionary) | 348 idiomas | código Apache 2.0; dados CC BY-SA 4.0 → shards derivados em CC BY-SA |
| Wikidata, propriedade P898 | IPA de nomes próprios | CC0 |
| JMdict / EDRDG | leituras em japonês | CC BY-SA 4.0 + crédito em cada tela + atualização mensal |
| pinyin-pro | hanzi → pinyin | MIT |

> 🗑️ Removidos na T0.5: `ro.txt` (CC BY-NC), `en_UK.txt` (GPL 3.0) e `es_ES`, `es_MX`, `fr_FR`, `fr_QC` (licença não informada). Ficaram `en_US`, `de`, `ja`, `ko`, `nl` e `sv`, com créditos em `packages/data/raw/ipa-dict/LICENSES.md`.

## 5. Como usar o effort

| Effort | Quando usar | Exemplos |
|---|---|---|
| **low** | Tarefa mecânica, padrão conhecido, sem decisão de design | configs, scripts, CI, páginas que só exibem dados, docs |
| **medium** | Feature com especificação clara; o risco está na execução, não no desenho | importadores, componentes de UI, testes E2E |
| **high** | Decisões de design, correção sutil, vários casos-limite | silabação, normalização de IPA, perfis de idioma, PWA |
| **xhigh** | Núcleo do produto; um erro aqui se propaga para tudo | motor de regras, G2P para ortografias irregulares |
| **max** | **Não usar** neste projeto | — |

Para economizar tokens:
- Abra cada tarefa numa sessão nova, apontando os arquivos e a seção deste plano. Não peça para o Claude "explorar o repo" de novo.
- Tarefas `high`/`xhigh` começam por um plano curto (plan mode) e só depois partem para o código.
- Revise com `/code-review` em `medium`. Use `high` só no motor (Fase 3).
- Gere conteúdo repetitivo (dicas, guia de sons) a partir de um modelo pronto, em `low`.

---

## 6. Tarefas

Legenda: **Dep.** = depende de; 👤 = precisa de decisão ou revisão humana.

### Fase 0 — Decisões e preparação

| ID | Tarefa | Effort | Entregável / critério de aceite | Dep. |
|---|---|---|---|---|
| T0.1 | ✅ **Concluída em 2026-11-13** — protótipo aprovado 👤 | — (humano) | Ajustes anotados como comentários no artifact | — |
| T0.2 | ✅ **Concluída em 2026-11-13** — licenças verificadas | medium | `packages/data/SOURCES.md` com o link e a licença de cada fonte e as obrigações de atribuição | — |
| T0.5 | ✅ **Concluída em 2026-11-13** — decisão do responsável (uso sem fins lucrativos, individual, fora dos canais oficiais): dicionários não permitidos removidos, EN-US mantido. Refazer com o jurídico se o uso mudar 👤 | — (humano) | Decisão registrada no SOURCES.md | T0.2 |
| T0.3 | 📝 **Rascunho pronto em 2026-11-13** ([docs/notacao.md](notacao.md)) — falta a revisão humana (13 questões na seção 9) 👤 | high | `docs/notacao.md` com regras e 50 exemplos; revisão de alguém da área de fonética ou locução | — |
| T0.4 | Classificação de governança | low | Nota em `docs/governanca.md`: sem modelo de IA e sem dados pessoais = projeto comum. Se a T3.9 adotar um modelo de ML, abrir Idea Case e classificar o risco. | T3.9 |

### Fase 1 — Fundação

| ID | Tarefa | Effort | Entregável / critério de aceite | Dep. |
|---|---|---|---|---|
| T1.1 | ✅ **Concluída em 2026-11-13.** Monorepo com pnpm workspaces; remover o backend Express, os resquícios do AI Studio e os dicionários reprovados na T0.2 | medium | Estrutura da seção 3; `pnpm dev` funciona de primeira; só ficam dicionários ✅/⚠️ do SOURCES.md | — |
| T1.2 | ✅ **Concluída em 2026-11-13.** Ferramentas: TS strict, ESLint (flat config), Prettier, Vitest, Playwright | low | `pnpm lint`, `pnpm typecheck` e `pnpm test` passam | T1.1 |
| T1.3 | 🟡 **Workflow escrito em 2026-11-13; falta rodar no GitHub (push).** CI (GitHub Actions): lint, typecheck, test, build, `pnpm audit` | low | Pipeline verde a cada PR | T1.2 |
| T1.4 | ✅ **Concluída em 2026-11-13.** Tailwind v4 instalado de verdade; tokens do protótipo (cores, tipografia, espaçamento); fontes self-hosted | low | Nenhum CSS ou JS de CDN no `index.html` | T0.1, T1.1 |
| T1.5 | ✅ **Concluída em 2026-11-13** (hospedagem ainda não escolhida; ver docs/deploy.md). Hospedagem estática com cabeçalhos de segurança (CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Content-Type-Options) | medium | CSP sem `unsafe-inline` em scripts; nota A no securityheaders.com | T1.1 |

### Fase 2 — Dados (`packages/data`)

| ID | Tarefa | Effort | Entregável / critério de aceite | Dep. |
|---|---|---|---|---|
| T2.1 | ✅ **Concluída em 2026-11-13** ([SCHEMA.md](../packages/data/SCHEMA.md)). Esquema intermediário único (`palavra, ipa, variante, fonte, frequência`) | medium | Tipos e validador; documento curto | T0.2 |
| T2.2 | ✅ **Concluída em 2026-11-13** (`pnpm --filter @falagringo/data import:ipa-dict`; 6 idiomas, 1,42 mi entradas, 0 erros, 0 avisos). Importador ipa-dict (migrar os `.txt` atuais) | low | TSV normalizado por idioma | T2.1 |
| T2.3 | ✅ **Concluída em 2026-11-13** (135.163 entradas, 0 falhas; 30 palavras de referência passam). Importador CMUdict com conversão ARPAbet → IPA | medium | Testes com 30 palavras conhecidas | T2.1 |
| T2.4 | ✅ **Concluída em 2026-11-13** (6 idiomas, cerca de 615 mil entradas, 0 erros). ⚠️ Os dados não têm tônica: it-IT e en-GB precisam de outra fonte (ver T2.10). Importador WikiPron (genérico por idioma) | medium | Um comando por idioma; atribuição registrada | T2.1 |
| T2.5 | ✅ **Concluída em 2026-11-13** (retrato versionado em `raw/wikidata/`). Importador de nomes próprios do Wikidata (P898), filtrando pessoas, lugares e clubes | medium | Dump filtrado com rótulo PT e IPA | T2.1 |
| T2.6 | ✅ **Concluída em 2026-11-13** ([MERGE.md](../packages/data/MERGE.md): precedência por palavra, 1,98 mi pronúncias, tônica emprestada en-US → en-GB). Normalização de IPA (NFC, ɡ/g, tie bars, marcas de tônica/sílaba, variantes) e merge com prioridade entre fontes | high | Testes de normalização; relatório de conflitos | T2.2–T2.5 |
| T2.7 | ✅ **Concluída em 2026-11-13** ([SHARDS.md](../packages/data/SHARDS.md): faixas em vez de prefixos; 98 shards ≤ 196 KB gzip). Gerador de shards por prefixo com hash e `manifest.json` | medium | Shards ≤ 200 KB comprimidos; busca de 1 palavra baixa 1 shard | T2.6 |
| T2.8 | ✅ **Concluída em 2026-11-13** ([COVERAGE.md](../packages/data/COVERAGE.md): 96–98% do uso real em en/de; es 86% e ko 44,5% → ver T5.1/T5.6). Relatório de cobertura por idioma | low | Tabela com nº de entradas e % de cobertura num corpus de frequência | T2.7 |
| T2.10 | ✅ **Concluída em 2026-11-13** ([ADR 0001](adr/0001-fonte-de-tonica.md): Wiktionary via kaikki.org + Britfone). **Fonte de tônica para it-IT e en-GB** (o WikiPron não traz): decidir entre Britfone (en-GB), raspagem própria do Wiktionary com tônica, ou extração do dump do Wiktionary (kaikki.org) 👤 | medium | ADR com a decisão + importador | T2.4 |
| T2.9 | ✅ **Concluída em 2026-11-13** (workflow `data-refresh.yml`; `NOTICE.md` gerado e conferido no CI). Atualização mensal automática dos dados (job agendado no CI) + `NOTICE` gerado a partir do SOURCES.md | low | Exigência da licença da EDRDG; atribuições sempre em dia | T2.7 |

### Fase 3 — Motor fonético (`packages/engine`) — núcleo do produto

| ID | Tarefa | Effort | Entregável / critério de aceite | Dep. |
|---|---|---|---|---|
| T3.1 | ✅ **Concluída em 2026-11-13** (`createEngine().convert()`, `ShardDictionary`; estágios substituíveis). Tipos de saída e API pública (`convert(text, lang, opts)`) | medium | Tipos com `syllables`, `stress`, `sounds[]`, `origin`, `variants` | T0.3 |
| T3.2 | ✅ **Concluída em 2026-11-13** ([LEXICON.md](../packages/data/LEXICON.md): léxico do português + regras do texto misto; números passam direto; JA: segmentação por dicionário fica na T5.5). Tokenização com `Intl.Segmenter`, números, hífens, apóstrofos e texto misto (não converter palavras em PT) | high | Testes com frases mistas e com JA/ZH sem espaço | T3.1 |
| T3.3 | ✅ **Concluída em 2026-11-13** (ida e volta 100% em 1.976.763 pronúncias; [INVENTORY.md](../packages/engine/INVENTORY.md)). Parser de IPA em fonemas (diacríticos, africadas, ditongos, tons) | high | Testes de round-trip; inventário por idioma | T3.1 |
| T3.4 | ✅ **Concluída em 2026-11-13** ([SYLLABLES.md](../packages/engine/SYLLABLES.md): fronteiras it 99,8%; tônica por regra en-US 78,9%, en-GB 69,8%, de 66%, nl 70%, it 69,5%). Silabação e tônica (usar as marcas da fonte; fallback pelo princípio do ataque máximo) | high | 100 casos por idioma da onda 1 | T3.3 |
| T3.5 | ✅ **Concluída em 2026-11-13** ([ADR 0002](adr/0002-motor-de-regras.md); cobertura 99,9997% dos sons reais; 66/69 exemplos da notação). **Motor de regras contextuais**: DSL de regras ordenadas por perfil (contexto anterior/posterior, posição na sílaba/palavra) | xhigh | ADR documentando a DSL; regras declarativas por idioma; testes | T3.4 |
| T3.6 | ✅ **Concluída em 2026-11-13**: decisões (a)–(d) aprovadas e registradas na notação; armadilhas omitidas acrescentadas; R11 das palavras funcionais em frase. **Os 69 exemplos da notação são o golden set** — o teste lê a própria notação e confere grafia e armadilhas (69/69). Renderização PT-BR | high | Segue `docs/notacao.md` à risca | T3.5 |
| T3.7 | ✅ **Concluída em 2026-11-13**: 300 palavras revisadas em cada variante (en-US e en-GB), 100% de acerto contra a meta de 95%. O revisor aprovou a saída do motor sem correções; daqui em diante, o gabarito protege o inglês contra regressões. Perfil do inglês (US e UK) | high | Golden set EN ≥ 300 palavras revisadas, com 95% ou mais de acerto 👤 | T3.6, T2.3 |
| T3.8 | ✅ **Concluída em 2026-11-13** (`pnpm test:golden`, no CI; rascunhos gerados: 300 por inglês, 200 es/fr/it/de, 100 nl/sv/ko — [golden/README.md](../packages/engine/golden/README.md) para o revisor). **Falta a revisão humana** 👤. Golden sets + harness de testes (métrica de acerto por idioma no CI) | medium | `pnpm test:golden` mostra o % de acerto por idioma | T3.6 |
| T3.9 | Estimativa para palavras fora do dicionário em EN/FR (decidir: regras ou modelo de ML) 👤. **Direção escolhida em 2026-11-13:** modelo G2P pequeno, treinado localmente (PC com GTX 1060 6 GB) só com dados liberados no SOURCES.md, servido como arquivo estático e executado no navegador. Custo zero: sem API paga, sem servidor e sem LLM. **Guia de treino e scripts prontos** ([treino-g2p.md](treino-g2p.md), `tools/g2p/`, testados de ponta a ponta). Falta: treinar no PC 👤, inferência em TS reproduzindo as fixtures, medição na grafia PT-BR, ADR e revisão de governança antes de uso real | xhigh | ADR com a decisão. Com ML: Idea Case, documentação do modelo e aviso "estimado" na UI | T3.7 |
| T3.10 | ✅ **Concluída em 2026-11-13** (`serveEngine`/`EngineClient` em `src/worker/`, `cachedDictionary`; `pnpm --filter @falagringo/engine bench`: 2.000 caracteres em ~10–15 ms com cache, 0,1–0,4 s a frio lendo os shards; o arquivo do worker no app e a publicação dos shards ficam na T4.2/T4.8). Wrapper em Web Worker + cache LRU de palavras | medium | A UI não trava com 2.000 caracteres | T3.6 |

### Fase 4 — Frontend (depois da T0.1)

| ID | Tarefa | Effort | Entregável / critério de aceite | Dep. |
|---|---|---|---|---|
| T4.1 | ✅ **Concluída em 2026-11-13** (`apps/web/src/ui/`, catálogo em `/catalogo.html`; elementos nativos em vez de Radix por causa da CSP — [ADR 0003](adr/0003-componentes-nativos.md); e2e com axe WCAG 2.2 AA, teclado e CSP). Componentes base acessíveis (botão, chip, tabs, popover, bottom sheet, toast), com Radix UI ou similar | medium | Storybook ou página de catálogo | T1.4 |
| T4.2 | ✅ **Concluída em 2026-11-14** (motor v2 no Web Worker com os shards em `/dict/`; en-US e en-GB; v1 removida; e2e com axe, CSP, variante, cópia e 2.000 caracteres). Ficam para as tarefas seguintes: painel de detalhe e áudio (T4.3), dicas (T4.4), navegação para Guia e Apresentador (T4.6/T4.7), selo offline (T4.8). Tela **Traduzir** (desktop e mobile), fiel ao protótipo | medium | Comparação visual com o protótipo | T4.1, T3.10 |
| T4.3 | ✅ **Concluída em 2026-11-14** (painel lateral no desktop e inferior no celular; som a som com destaque, fonte, concordância, tônica emprestada/por regra, variantes; áudio com legenda "voz sintética do navegador", desativado com o motivo quando não há voz; e2e com teclado, axe e vozes simuladas). As explicações de cada som ("como o u de quase") entram com o conteúdo revisado da T4.5. Painel de detalhe da palavra: som a som, variantes, IPA e botão de áudio (Web Speech API com rótulo "voz sintética do navegador") | medium | Funciona por teclado; o áudio degrada bem sem voz instalada | T4.2 |
| T4.4 | Dicas contextuais (aparecem conforme os sons especiais presentes na frase) | low | Dicas vêm de `packages/content` | T4.2 |
| T4.5 | Conteúdo das dicas e do guia de sons por idioma 👤 | medium | Textos revisados por humano | T0.3 |
| T4.6 | Página **Guia de sons** | low | Dirigida por dados, filtro por idioma | T4.5 |
| T4.7 | ✅ **Concluída em 2026-11-14** (rota `#/apresentar`; texto misto com o léxico baixado só aqui; leitura em amarelo acima do nome, IPA opcional, 40–96 px (padrão 64), roteiro editável, avisos de variantes e de palavra fora do dicionário; atalhos Espaço/+/−/I/E documentados na tela; e2e com axe e CSP). Ajuste manual português/estrangeiro por palavra fica para depois. **Modo apresentador** (teleprompter: fonte grande, leitura acima da palavra, alto contraste, rolagem) | medium | Legível a 3 m; atalhos de teclado documentados | T4.2 |
| T4.8 | ✅ **Concluída em 2026-11-14** (`vite-plugin-pwa`/Workbox com registro no código, sem script inline; app shell pré-carregado (28 arquivos, 689 KB); shards em CacheFirst "fg-dict" — sob demanda ao usar e completo pela página `#/offline`, com tamanho, progresso, cota, `persist()` e limpeza de versões antigas; selo "Disponível offline"; aviso de versão nova; `_headers`/Nginx com cache certo para `sw.js` e `manifest.json`; e2e offline com `setOffline`). Gerenciador de idiomas offline + PWA (Workbox; cache sob demanda e completo; aviso de cota) | high | Funciona em modo avião depois do download; mostra o tamanho estimado | T2.7 |
| T4.9 | ✅ **Concluída em 2026-11-14** (recentes e favoritos em localStorage; "Compartilhar link" com `?t=&l=`). Histórico e favoritos locais + compartilhar por URL (`?t=&l=`) | low | Nada sai do navegador | T4.2 |
| T4.10 | ✅ **Concluída em 2026-11-14** (tokens escuros; Auto segue o sistema, Claro/Escuro forçam via `data-theme`; axe nos dois temas; movimento reduzido já respeitado). Tema claro/escuro e `prefers-reduced-motion` | low | — | T4.1 |
| T4.12 | ✅ **Concluída em 2026-11-14** (rota `#/creditos` gerada de `sources.ts`; crédito no rodapé de todas as telas). Página **Fontes e créditos** + crédito no rodapé de cada tela (exigência da EDRDG e do CC BY-SA) | low | Lista gerada do SOURCES.md | T2.9 |
| T4.11 | Auditoria de acessibilidade (axe, teclado, leitor de tela, contraste) | medium | Zero violações graves no axe; leitor de tela lê a pronúncia | T4.2–T4.7 |

### Fase 5 — Idiomas (cada um = perfil de regras + G2P se aplicável + golden set + dicas)

| ID | Idioma | Effort | Observações | Dep. |
|---|---|---|---|---|
| T5.1 | Espanhol (ES e 419) | medium | **Sem `de` no dicionário, o texto misto não atrai o "de" de "Jerez de la Frontera"** (resolve com o G2P). **Usar o G2P também para escolher a variante principal do WikiPron** (a ordem dele é a da página: `la` vem como `a` antes de `la`). **G2P por regras é obrigatório:** o WikiPron não tem palavras básicas (`de`, `a`, `o`) nem formas verbais (`quieres`) — cobertura atual 86% do uso. Ortografia regular; G2P por regras resolve quase tudo; variantes θ/s, ʝ/ʃ | T3.8 |
| T5.2 | Italiano | medium | Ortografia regular; consoantes duplas | T3.8 |
| T5.3 | Alemão | medium | ç/x, ʁ, vogais arredondadas, ditongos, compostos | T3.8 |
| T5.4 | Francês | high | **Escolher a variante principal do WikiPron por regra/concordância** (ex.: `petit` vem como `piti` antes de `pəti`). Nasais, liaison, letras mudas; depende bastante do dicionário | T3.9 |
| T5.5 | Japonês | high | **Segmentação guiada pelo dicionário:** o ICU quebra "ございます" em ご·ざ·い·ます. **Kana → IPA por regra é obrigatório:** a fonte tem as palavras quase só em kanji (`ありがとう` não existe nela). Segmentação, kanji → kana (JMdict), kana → IPA, u/i desvozeados, acento de altura | T3.2 |
| T5.6 | Coreano | high | **Cobertura do dicionário é só 44,5% do uso** (faltam formas flexionadas): a conversão de Hangul por regra é o caminho principal. Hangul é fonético, mas tem regras (ligação, nasalização, tensificação) | T3.2 |
| T5.7 | Mandarim | high | Hanzi → pinyin (polifonia), pinyin → IPA, representação dos tons na UI | T3.2 |
| T5.8 | Nomes próprios (multi-idioma, Wikidata) | medium | Prioridade: esportes, política internacional, cidades | T2.5 |
| T5.9 | Template "novo idioma via WikiPron" + 1 piloto (ex.: holandês ou polonês) | medium; depois **low** por idioma | Checklist de 1 página para adicionar idiomas | T5.1 |

### Fase 6 — Qualidade, segurança e lançamento

| ID | Tarefa | Effort | Entregável / critério de aceite | Dep. |
|---|---|---|---|---|
| T6.1 | Testes E2E (Playwright): traduzir, detalhe, offline, apresentador, mobile | medium | CI verde | Fase 4 |
| T6.2 | Revisão de segurança (CSP, dependências, headers, Service Worker) | high | `/security-review` sem achados abertos | Fase 4 |
| T6.3 | Orçamento de performance (JS inicial, LCP, tempo de conversão) | medium | Metas definidas e medidas no CI (Lighthouse) | Fase 4 |
| T6.4 | Revisão linguística final dos golden sets 👤 | — (humano) | Assinatura do revisor por idioma | Fase 5 |
| T6.5 | Atualizar CLAUDE.md e README | low | — | todas |
| T6.6 | Deploy + monitoramento de erros **sem dados pessoais** (sem o texto digitado) | medium | Se houver analytics: validar com o DPO (LGPD) | T6.2 |

## 7. Marcos

1. **M0 — Decisões** (Fase 0): notação aprovada e protótipo aprovado.
2. **M1 — Esqueleto** (Fase 1 + T2.1–T2.2 + T3.1): monorepo, CI e o motor convertendo EN com o dicionário atual.
3. **M2 — Motor confiável em EN** (T2.3–T2.7, T3.2–T3.10): golden set EN com 95% ou mais de acerto. Meta de acerto atingida em 2026-11-13 (100% em en-US e en-GB, 300 revisadas cada); falta a T3.9.
4. **M3 — Nova interface** (Fase 4): paridade com o protótipo, PWA offline e a11y.
5. **M4 — Onda 1 de idiomas** (T5.1–T5.4, T5.8).
6. **M5 — Onda 2** (T5.5–T5.7) e lançamento (Fase 6).

## 8. Governança e responsabilidade

- As aproximações são **heurísticas**. Qualquer uso em conteúdo publicado ou no ar precisa de revisão humana; a interface deve dizer isso de forma visível.
- O áudio usa voz sintética do navegador, com rótulo explícito. Nenhuma voz imita pessoas reais.
- O texto digitado é processado só no navegador e nunca é enviado. Se no futuro houver coleta (analytics, contas, histórico na nuvem): validar com o DPO.
- Se a T3.9 adotar um modelo de ML: Idea Case, classificação de risco, documentação do modelo e aviso ao usuário. Incidentes devem ser reportados a governanca@redegazeta.com.br.
