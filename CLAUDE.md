# CLAUDE.md

Guia para o Claude Code (e para pessoas) trabalharem neste repositório.

## O que é o projeto

**FalaGringo** mostra a um falante de português brasileiro **como pronunciar palavras em outro idioma**, usando a grafia do PT-BR. O usuário digita um texto (hoje, só em inglês americano) e recebe, para cada palavra:

1. a transcrição **IPA**, tirada de um dicionário;
2. uma **aproximação em PT-BR** gerada a partir do IPA (ex.: `think` → `θɪŋk` → `THINK` com o `th` destacado).

O projeto está **em reconstrução (v2)**. Antes de qualquer tarefa, leia:

| Documento | Para quê |
|---|---|
| [docs/PLANO-V2.md](docs/PLANO-V2.md) | Fases, tarefas, dependências e **o effort de cada tarefa** |
| [docs/notacao.md](docs/notacao.md) | Especificação da grafia PT-BR (regras, exemplos, questões abertas). É a referência do motor |
| [packages/data/SOURCES.md](packages/data/SOURCES.md) | Fontes de dados permitidas e suas licenças |
| Protótipo aprovado | https://claude.ai/artifact/68SFbsmQMLiwk4eQM99QFv (referência visual da Fase 4; ajustes na seção 8 da notação) |

**Effort:** cada tarefa do plano tem um effort definido. Se o effort da sessão for diferente do da tarefa, **avise o usuário e espere a troca antes de começar**.

## Estrutura (monorepo pnpm)

```
apps/web/            Frontend v2 (React 19 + Vite 6): tela Traduzir, motor num Web Worker, componentes em src/ui
packages/data/       Dicionários brutos (raw/ipa-dict), SOURCES.md, formato intermediário (src/, SCHEMA.md) e scripts
packages/engine/     Motor fonético v2: createEngine().convert(); estágios em src/stages.ts
packages/content/    Dicas e guia de sons — vazio, preenchido na T4.5
docs/                Plano, notação, deploy e ADRs (docs/adr/)
tools/g2p/           Treino do modelo G2P (Python 3.12 + PyTorch), fora do workspace pnpm — guia em docs/treino-g2p.md
```

Não há backend. O site é 100% estático: os shards dos idiomas ativos são publicados em `apps/web/public/dict/` (ignorado pelo git) e servidos pelo Vite.

## Comandos

```bash
pnpm install       # Node >= 20, pnpm 11 (o pnpm-workspace.yaml libera só o build do esbuild)
pnpm dev           # publica os shards ativos (roda o pipeline de dados se faltar, ~40 s) e sobe o Vite em http://localhost:5173
pnpm build         # build estático em apps/web/dist
pnpm preview       # serve o build
pnpm typecheck     # tsc (strict) em todos os pacotes que têm o script
pnpm lint          # ESLint (flat config, typescript-eslint + react-hooks)
pnpm format        # Prettier (format:check no CI)
pnpm test          # Vitest — arquivos *.test.ts(x) em apps/*/src e packages/*/src
pnpm test:e2e      # Playwright (e2e/), sobe build + preview na porta 4173
```

O CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) roda tudo acima, mais `pnpm audit --audit-level high`, em cada push na `master` e em cada PR. Antes de concluir uma tarefa, rode `pnpm lint && pnpm typecheck && pnpm test`.

## Motor (`packages/engine`)

- API: `createEngine({ dictionary, phonology, tokenizer?, estimator? }).convert(texto, idioma)` → `ConversionResult` (tipos em `src/types.ts`, contrato na seção 10 da notação).
- Estágios substituíveis (`src/stages.ts`): `Tokenizer` (T3.2), `Dictionary` (`ShardDictionary`, lê os shards; carregamento injetado, LRU e pedidos simultâneos juntados), `Phonology` (T3.3–T3.6), `Estimator` (T3.9/T5.x). `placeholderPhonology` é **provisória** (até a T3.6).
- **Tokenizador** (`src/tokenizer.ts`): `Intl.Segmenter` + correções (apóstrofo tipográfico, compostos com hífen, elisão `l'école`, `'bout`); palavras levam `norm` (forma de busca) e `parts` (reserva, usada só se a palavra inteira não estiver no dicionário). Números passam direto.
- **Parser de IPA** (`src/ipa/parse.ts`): `parseIpa(ipa, idioma)` → tokens (som, tônica, sílaba, espaço, tom, ligação, pausa, outro). Cada som tem `text` (original), `base` canônica (sem diacríticos de traço; ligadura padronizada; `ʦ` → `t͡s`) e `features`. Africadas sem ligadura e ditongos sem `̯` são agrupados **por idioma** (`src/ipa/symbols.ts`). Garantia: `serializeIpa(parseIpa(x)) === NFC(x)`. `pnpm --filter @falagringo/engine inventory` analisa todos os dados e regenera o [INVENTORY.md](packages/engine/INVENTORY.md) — rode após mudar o parser ou os dados.
- **Silabação e tônica** (`src/ipa/syllabify.ts`): o `.` da fonte manda (exceto no inglês, que sempre usa ataque máximo); as marcas `ˈ/ˌ` só dizem qual núcleo é tônico, nunca a fronteira. Sem marca, regra do idioma (`stress: 'rule'`). **Toda mudança de regra deve ser medida**: `pnpm --filter @falagringo/engine syllables-eval` regenera o [SYLLABLES.md](packages/engine/SYLLABLES.md) — compare antes/depois.
- **Regras IPA → PT-BR** (`src/rules/`, desenho no [ADR 0002](docs/adr/0002-motor-de-regras.md)): `core.ts` (notação, seção 4 + R6–R10 + armadilhas), `profiles.ts` (perfis, antes do núcleo; a 1ª regra que casa vence). Padrões em IPA (`'ɔ̃'` antes de `'ɔ'`) ou classes (`'@nasal'`). Ao mexer: (1) `pnpm test` — inclui o **golden set**, que o teste lê direto da seção 7 de `docs/notacao.md` (grafia e armadilhas dos 69 exemplos; mudar a notação muda o teste), e o teste de regra sombreada; (2) `pnpm --filter @falagringo/engine rules-coverage` para conferir que nenhum som caiu no reserva `?`. A fonologia (`createPhonology`) é o padrão do motor.
- **Worker e cache** (`src/worker/`, `src/cache.ts`): no navegador o motor roda num Web Worker. Lado do worker: `serveEngine(self, () => criarMotor())` (motor criado no 1º pedido; falha é repetida no seguinte). Lado da tela: `new EngineClient(worker)` com `convert()` e `convertLatest()` (resolve `undefined` se um pedido mais novo chegou — use na digitação). Envolva o dicionário com `cachedDictionary()` (LRU por palavra): sem ele, textos longos em idiomas com muitos shards ficam ~20× mais lentos. `pnpm --filter @falagringo/engine bench` mede 2.000 caracteres com os dados reais (precisa do `shards`).
- **Modelo G2P (T3.9, em andamento):** treinado fora do repositório, num PC com GPU, por [docs/treino-g2p.md](docs/treino-g2p.md) com os scripts de `tools/g2p/` (`prepare` → `train` → `evaluate` → `export`). O export (`g2p.json` + `g2p.bin` + `fixtures.tsv`) é o contrato da futura inferência em TypeScript, que tem de reproduzir o `fixtures.tsv`. Ao mudar `model.py`, mude junto o export e a inferência. Dados, checkpoints e exports não vão para o git.
- **Golden sets** (`packages/engine/golden/{idioma}.tsv`): gabaritos revisados por humano; só as linhas `revisado` contam. `pnpm test:golden` mede o acerto (roda no CI; falha abaixo das metas de `golden/metas.json`) e regenera o [GOLDEN.md](packages/engine/GOLDEN.md). `golden:draft` acrescenta rascunhos sem mexer nas linhas existentes. **Nunca marque `revisado` no lugar do revisor.**
- **Texto misto** (`convert(texto, idioma, { mixed })`): decide o que é português com o léxico `pt-BR` (gerado em `shards`; leia com `parsePtLexicon`) + dicionário + atração de palavras funcionais. Regras e casos reais em [packages/data/LEXICON.md](packages/data/LEXICON.md) — atualize a tabela de verificação se mudar as regras.
- **TypeScript puro**: `tsconfig.json` sem DOM nem Node (o compilador garante); os testes usam `tsconfig.test.json`. Não importe `fetch`, `fs` etc. no código do motor — injete.

## Fluxo do site (`apps/web/src`)

```
packages/data/scripts/sync-web.mjs  → publica em apps/web/public/dict/: manifest (só idiomas ACTIVE) + shards + NOTICE.md;
                                      sem build/dict, roda o pipeline (import → merge → shards) a partir de raw/
app/route.ts + App.tsx               → rotas por hash (#/ Traduzir, #/apresentar); foco vai ao título ao trocar de tela
engine/engine.worker.ts              → serveEngine + createEngine(ShardDictionary via fetch de /dict/, cachedDictionary);
                                      um 2º motor com o léxico do português é criado no 1º pedido `mixed`
engine/useConversion.ts              → EngineClient (um worker por página), espera de 250 ms, convertLatest
engine/langs.ts                      → idiomas e variantes oferecidos na tela
translate/TranslateScreen.tsx        → tela Traduzir (idioma, variante, entrada, cartões, leitura, copiar)
translate/Pronunciation.tsx          → sílabas com tônica e destaque laranja por segmento (notação, seção 5.1)
translate/WordDetail.tsx             → detalhe: som a som, fonte, variantes, áudio (painel lateral ≥ 1024 px; inferior abaixo)
translate/useSpeech.ts               → voz sintética do navegador (Web Speech); sem voz no idioma, desativa e explica
app/                                 → cabeçalho (navegação + tema), rodapé com créditos, #/creditos (de sources.ts),
                                      storage.ts (recentes/favoritos em localStorage), share.ts (?t=&l=), theme.ts
offline/                             → PWA (T4.8): offlineStore.ts (Cache Storage "fg-dict", o MESMO cache CacheFirst do service
                                      worker em vite.config.ts — mude os dois juntos), OfflineScreen (#/offline), selo offline
present/PresenterScreen.tsx          → modo apresentador: roteiro com texto misto, leitura em amarelo acima do nome, IPA,
                                      tamanhos 40–96 px, atalhos (Espaço, + −, I, E) listados na própria tela
```

## Convenções e armadilhas

- **Ativar um idioma no site** exige duas mudanças sincronizadas: `ACTIVE` em [packages/data/scripts/sync-web.mjs](packages/data/scripts/sync-web.mjs) e `LANG_GROUPS` em [apps/web/src/engine/langs.ts](apps/web/src/engine/langs.ts). Só ative idiomas com perfil de regras e golden set revisado (Fase 5). Hoje: en-US e en-GB.
- **Dados novos no site:** `packages/data/build/dict` é reaproveitado se existir; depois de mudar dados ou pipeline, rode `merge` e `shards` (ou apague `build/dict`) antes do `pnpm dev`. Os nomes dos shards levam hash, então o cache do navegador não serve dado velho.
- **Licenças:** só existem dicionários permitidos (`en_US`, `de`, `ja`, `ko`, `nl`, `sv`), com créditos em [packages/data/raw/ipa-dict/LICENSES.md](packages/data/raw/ipa-dict/LICENSES.md). **Nenhuma fonte entra sem registro no SOURCES.md.** Dados NC (não comercial), GPL e sem licença estão proibidos. O uso declarado é individual, sem fins lucrativos e fora dos canais oficiais; se isso mudar, as licenças precisam ser revistas.
- **EN-US é obrigatório** e é o idioma principal.
- **Dados:** todo importador grava no formato intermediário de [packages/data/SCHEMA.md](packages/data/SCHEMA.md), validado por `validateEntry`. Fonte nova exige registro em `SOURCES.md` **e** em `packages/data/src/sources.ts`, senão o validador rejeita. Idiomas usam tags BCP 47 (`en-US`, `es-419`…).
- **Pipeline de dados** (`pnpm --filter @falagringo/data <script>`): `import:ipa-dict`, `import:cmudict`, `import:britfone`, `import:wikipron`, `import:wiktextract`, `import:wikidata` → `packages/data/build/intermediate/{lang}/{fonte}.tsv` (ignorado pelo git); depois `merge` → `build/merged/{lang}.tsv`. Regras de prioridade, normalização e tônica (`marked`/`borrowed`/`mono`/`none`) em [packages/data/MERGE.md](packages/data/MERGE.md). Ao mudar uma regra do merge, rode `merge` e atualize a tabela de resultado do MERGE.md. Por fim, `shards` → `build/dict/` (manifest + shards por faixa de chaves, ≤ 200 KB gzip). Formato e busca em [packages/data/SHARDS.md](packages/data/SHARDS.md). A busca depende de `lookupKey` + comparação `<` de strings JS: não mude uma sem a outra.
- **Relatórios e créditos:** `coverage` gera `packages/data/COVERAGE.md` (uso real coberto por idioma); `notice` gera `packages/data/NOTICE.md` a partir de `sources.ts` — o CI falha se estiver desatualizado (`notice:check`). Ao mexer em `SOURCES`/`PRIORITY`, rode `notice`. O workflow `data-refresh.yml` renova Wikidata e Wiktionary todo mês e abre um PR. Cada `raw/<fonte>/README.md` diz versão, licença e como atualizar. `fetch:wikidata` e `extract:wiktextract` acessam a rede e só são usados para **atualizar** os retratos versionados.
- **Tônica:** cada fonte declara em `sources.ts` se traz tônica (`stress`). **O WikiPron não traz**; a tônica de it-IT e en-GB vem do Wiktionary via kaikki ([ADR 0001](docs/adr/0001-fonte-de-tonica.md)). Não trate "sem `ˈ`" como "sem tônica".
- **Estilos:** Tailwind v4 via `@tailwindcss/vite`; tokens de design no bloco `@theme` de [apps/web/src/index.css](apps/web/src/index.css) (cores `canvas`, `surface`, `ink`, `muted`, `accent`, `special`…; fontes `font-display`, `font-ipa`). Use os tokens em vez de hex soltos; o tema escuro (T4.10) redefine os mesmos tokens em `index.css`, então cor nova precisa de valor nos dois temas (o e2e roda axe em ambos). Os tokens e estilos marcados como legados da v1 saem na T4.2.
- **Service worker (T4.8):** só existe no build (`pnpm build && pnpm preview`; no `pnpm dev`, não). Registro em `src/app/pwa.ts` (`injectRegister: false`: o script inline padrão do plugin quebraria a CSP). Os dicionários ficam fora do precache (`globIgnores`); subconjuntos de fonte também, exceto latin, latin-ext e greek (o IPA usa θ, β, χ). Nome de arquivo sem hash em `/dict/` (só o `manifest.json`) precisa de `no-cache` no `_headers`.
- **Nada de CDN:** fontes vêm de `@fontsource` e são servidas pelo próprio site. Não adicione scripts, estilos ou fontes externos.
- **CSP rígida** (sem `unsafe-inline`, sem `data:`): fonte única em [apps/web/security-headers.ts](apps/web/security-headers.ts), aplicada no `dist/_headers`, no `<meta>` do build e no `vite preview`. Não vale no `pnpm dev`. Recurso novo bloqueado? Ajuste lá e rode `pnpm test:e2e`, que falha em qualquer violação ou requisição externa. O `assetsInlineLimit: 0` no Vite é proposital. Deploy: [docs/deploy.md](docs/deploy.md).
- Conteúdo visível ao usuário fica em PT-BR. A v1 ainda mistura rótulos em inglês.
- **Componentes base** (`apps/web/src/ui/`, T4.1): `Button`, `Chip`, `Segmented`, `Tabs`, `Popover`, `BottomSheet`, `ToastProvider`/`useToast`, sobre elementos nativos (`<dialog>`, Popover API), **sem Radix**, porque ele injeta `<style>` e a CSP bloqueia ([ADR 0003](docs/adr/0003-componentes-nativos.md)). Use-os nas telas em vez de recriar. O catálogo fica em `/catalogo.html`. O e2e `e2e/componentes.spec.ts` roda axe (WCAG 2.2 AA), teclado e CSP; componente novo entra no catálogo e no teste. Biblioteca nova de UI: confira antes se ela injeta estilos.
- Alias `@/*` → `apps/web/src/*`.

## Governança

Projeto interno da Rede Gazeta, sujeito à Política de Uso Ético e Seguro de IA. As pronúncias são **heurísticas**: qualquer uso em conteúdo publicado ou no ar exige revisão humana. Se o projeto passar a usar modelos de IA ou coletar dados de usuários, precisa de Idea Case, classificação de risco e, com dados pessoais, validação com o DPO. Incidentes devem ser reportados a governanca@redegazeta.com.br.
