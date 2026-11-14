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
apps/web/            Frontend v1 (React 19 + Vite 6), ainda com a lógica antiga em src/services
packages/data/       Dicionários brutos (raw/ipa-dict), SOURCES.md, formato intermediário (src/, SCHEMA.md) e scripts
packages/engine/     Motor fonético v2: createEngine().convert(); estágios em src/stages.ts
packages/content/    Dicas e guia de sons — vazio, preenchido na T4.5
docs/                Plano, notação, deploy e ADRs (docs/adr/)
```

Não há backend. O site é 100% estático: o dicionário é copiado para `apps/web/public/dict/` (ignorado pelo git) e servido pelo Vite.

## Comandos

```bash
pnpm install       # Node >= 20, pnpm 11 (o pnpm-workspace.yaml libera só o build do esbuild)
pnpm dev           # copia os dicionários ativos e sobe o Vite em http://localhost:5173
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
- **Golden sets** (`packages/engine/golden/{idioma}.tsv`): gabaritos revisados por humano; só as linhas `revisado` contam. `pnpm test:golden` mede o acerto (roda no CI; falha abaixo das metas de `golden/metas.json`) e regenera o [GOLDEN.md](packages/engine/GOLDEN.md). `golden:draft` acrescenta rascunhos sem mexer nas linhas existentes. **Nunca marque `revisado` no lugar do revisor.**
- **Texto misto** (`convert(texto, idioma, { mixed })`): decide o que é português com o léxico `pt-BR` (gerado em `shards`; leia com `parsePtLexicon`) + dicionário + atração de palavras funcionais. Regras e casos reais em [packages/data/LEXICON.md](packages/data/LEXICON.md) — atualize a tabela de verificação se mudar as regras.
- **TypeScript puro**: `tsconfig.json` sem DOM nem Node (o compilador garante); os testes usam `tsconfig.test.json`. Não importe `fetch`, `fs` etc. no código do motor — injete.

## Fluxo atual (v1, dentro de `apps/web/src`)

```
packages/data/scripts/sync-web.mjs  → copia os dicionários de ACTIVE para apps/web/public/dict/
services/dictionaryService.ts        → fetch de /dict/{lang}.txt (TSV "palavra\t/ipa/") → cache IndexedDB → Map
App.tsx                              → input com debounce de 500 ms → translateText()
services/translator.ts               → tokeniza, busca no Map, converte
services/ipaMappings.ts              → IPA → PT-BR caractere a caractere (no máximo 2) — será substituído pelo motor v2
```

## Convenções e armadilhas

- **Ativar um idioma na v1** exige duas mudanças sincronizadas: `ACTIVE` em [packages/data/scripts/sync-web.mjs](packages/data/scripts/sync-web.mjs) e `AVAILABLE_LANGUAGES` em [apps/web/src/services/dictionaryService.ts](apps/web/src/services/dictionaryService.ts).
- **Mudou o formato do dicionário ou do cache? Incremente `VERSION`** em `dictionaryService.ts` (hoje `v2`). O IndexedDB dos usuários guarda o texto da versão anterior.
- **Licenças:** só existem dicionários permitidos (`en_US`, `de`, `ja`, `ko`, `nl`, `sv`), com créditos em [packages/data/raw/ipa-dict/LICENSES.md](packages/data/raw/ipa-dict/LICENSES.md). **Nenhuma fonte entra sem registro no SOURCES.md.** Dados NC (não comercial), GPL e sem licença estão proibidos. O uso declarado é individual, sem fins lucrativos e fora dos canais oficiais; se isso mudar, as licenças precisam ser revistas.
- **EN-US é obrigatório** e é o idioma principal.
- **Dados:** todo importador grava no formato intermediário de [packages/data/SCHEMA.md](packages/data/SCHEMA.md), validado por `validateEntry`. Fonte nova exige registro em `SOURCES.md` **e** em `packages/data/src/sources.ts`, senão o validador rejeita. Idiomas usam tags BCP 47 (`en-US`, `es-419`…).
- **Pipeline de dados** (`pnpm --filter @falagringo/data <script>`): `import:ipa-dict`, `import:cmudict`, `import:britfone`, `import:wikipron`, `import:wiktextract`, `import:wikidata` → `packages/data/build/intermediate/{lang}/{fonte}.tsv` (ignorado pelo git); depois `merge` → `build/merged/{lang}.tsv`. Regras de prioridade, normalização e tônica (`marked`/`borrowed`/`mono`/`none`) em [packages/data/MERGE.md](packages/data/MERGE.md). Ao mudar uma regra do merge, rode `merge` e atualize a tabela de resultado do MERGE.md. Por fim, `shards` → `build/dict/` (manifest + shards por faixa de chaves, ≤ 200 KB gzip). Formato e busca em [packages/data/SHARDS.md](packages/data/SHARDS.md). A busca depende de `lookupKey` + comparação `<` de strings JS: não mude uma sem a outra.
- **Relatórios e créditos:** `coverage` gera `packages/data/COVERAGE.md` (uso real coberto por idioma); `notice` gera `packages/data/NOTICE.md` a partir de `sources.ts` — o CI falha se estiver desatualizado (`notice:check`). Ao mexer em `SOURCES`/`PRIORITY`, rode `notice`. O workflow `data-refresh.yml` renova Wikidata e Wiktionary todo mês e abre um PR. Cada `raw/<fonte>/README.md` diz versão, licença e como atualizar. `fetch:wikidata` e `extract:wiktextract` acessam a rede e só são usados para **atualizar** os retratos versionados.
- **Tônica:** cada fonte declara em `sources.ts` se traz tônica (`stress`). **O WikiPron não traz**; a tônica de it-IT e en-GB vem do Wiktionary via kaikki ([ADR 0001](docs/adr/0001-fonte-de-tonica.md)). Não trate "sem `ˈ`" como "sem tônica".
- **Estilos:** Tailwind v4 via `@tailwindcss/vite`; tokens de design no bloco `@theme` de [apps/web/src/index.css](apps/web/src/index.css) (cores `canvas`, `surface`, `ink`, `muted`, `accent`, `special`…; fontes `font-display`, `font-ipa`). Use os tokens em vez de hex soltos. Os tokens e estilos marcados como legados da v1 saem na T4.2.
- **Nada de CDN:** fontes vêm de `@fontsource` e são servidas pelo próprio site. Não adicione scripts, estilos ou fontes externos.
- **CSP rígida** (sem `unsafe-inline`, sem `data:`): fonte única em [apps/web/security-headers.ts](apps/web/security-headers.ts), aplicada no `dist/_headers`, no `<meta>` do build e no `vite preview`. Não vale no `pnpm dev`. Recurso novo bloqueado? Ajuste lá e rode `pnpm test:e2e`, que falha em qualquer violação ou requisição externa. O `assetsInlineLimit: 0` no Vite é proposital. Deploy: [docs/deploy.md](docs/deploy.md).
- Conteúdo visível ao usuário fica em PT-BR. A v1 ainda mistura rótulos em inglês.
- Alias `@/*` → `apps/web/src/*`.

## Governança

Projeto interno da Rede Gazeta, sujeito à Política de Uso Ético e Seguro de IA. As pronúncias são **heurísticas**: qualquer uso em conteúdo publicado ou no ar exige revisão humana. Se o projeto passar a usar modelos de IA ou coletar dados de usuários, precisa de Idea Case, classificação de risco e, com dados pessoais, validação com o DPO. Incidentes devem ser reportados a governanca@redegazeta.com.br.
