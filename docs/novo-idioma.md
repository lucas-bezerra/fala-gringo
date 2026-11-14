# Checklist: idioma novo (T5.9)

Roteiro de uma página para levar um idioma do dicionário ao site. Na Fase 5, foi seguido para espanhol, italiano e alemão. O piloto avaliado com ele foi o holandês (resultado no fim).

## 1. Dados (effort low)

- [ ] **Fonte registrada:** está no [SOURCES.md](../packages/data/SOURCES.md) **e** em `packages/data/src/sources.ts`, com licença, crédito e se traz tônica. Fonte NC, GPL ou sem licença: não entra.
- [ ] **Importação e merge:** importado no formato intermediário (`import:*`) e `merge` rodado. Em [MERGE.md](../packages/data/MERGE.md), confira a regra de tônica do idioma (`marked`/`borrowed`/`mono`/`none`).
- [ ] **Cobertura:** `coverage` mostra quanto do uso real o dicionário cobre ([COVERAGE.md](../packages/data/COVERAGE.md)). **Abaixo de ~95%, o idioma precisa de estimativa** (passo 3) antes de ir ao ar.

## 2. Motor (effort medium)

- [ ] **Parser:** `inventory` (ver [INVENTORY.md](../packages/engine/INVENTORY.md)) não mostra símbolos estranhos. Africadas sem ligadura e ditongos do idioma estão em `src/ipa/symbols.ts`.
- [ ] **Silabação e tônica:** a regra de tônica para IPA sem marca está em `ruleStress` (`src/ipa/syllabify.ts`). Meça com `syllables-eval` antes e depois.
- [ ] **Regras:** `rules-coverage` sem nenhum som no reserva `?`. As particularidades vão num perfil em `src/rules/profiles.ts`, com a notação, seção 6, como referência.
- [ ] **Texto misto:** palavras funcionais do idioma em `src/functionWords.ts` (atração em "Bank of America", "Jerez de la Frontera").

## 3. Estimativa para palavras fora do dicionário

Escolha uma opção:
- **Ortografia regular (espanhol, italiano):** G2P por regras em `src/g2p/<idioma>.ts` + `ruleToIpa` em `src/g2p/rules.ts`, saindo no **mesmo estilo de IPA da fonte**. Meça contra o dicionário inteiro: o espanhol chegou a ~97% e o italiano a ~93%. O mesmo módulo, com `prefer`, escolhe a variante principal quando a fonte lista uma dialetal primeiro.
- **Ortografia irregular (inglês, francês, alemão, holandês):** modelo G2P treinado localmente, pelo [treino-g2p.md](treino-g2p.md). Os modelos publicados vão em `packages/data/models/g2p/<idioma>/`. Confira a licença dos dados: CC BY-SA obriga a distribuir o modelo sob a mesma licença ([ADR 0004](adr/0004-modelo-g2p.md)).

## 4. Gabarito (👤 revisor)

- [ ] **Rascunhos:** `golden:draft` gera os rascunhos (inclua o idioma em `PLAN`, no script).
- [ ] **Revisão:** o revisor confere e marca `revisado`. **Nunca marque no lugar dele** ([golden/README.md](../packages/engine/golden/README.md)).
- [ ] **Meta:** pelo menos 30 linhas revisadas, e a meta do idioma (95%) em `golden/metas.json`. O `test:golden` falha no CI abaixo dela.

## 5. Site (effort low)

- [ ] **Ativação:** o idioma entra em `ACTIVE` (`packages/data/scripts/sync-web.mjs`) **e** em `LANG_GROUPS` (`apps/web/src/engine/langs.ts`), sempre juntos. A 1ª variante é a padrão.
- [ ] **Teste:** um e2e com uma palavra do dicionário e uma estimada (`e2e/smoke.spec.ts`).
- [ ] **Verificação:** `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm budget`.
- [ ] **Documentação:** "Hoje: …" em CLAUDE.md, README e a linha da tarefa no plano.
- [ ] **Dicas:** as dicas de pronúncia do idioma (`packages/content`, T4.5), quando existirem.

## Piloto: holandês (2026-11-14)

| Passo | Situação |
|---|---|
| 1. Dados | INT via ipa-dict (CC BY), com tônica. **Cobertura de 84,8%**: faltam palavras básicas (*is*, *zou*, *ga*, *had*, *gaat*) |
| 2. Motor | Sem som no reserva; ditongos `ɛi œy ʌu ɑu` agrupados; palavras funcionais cadastradas |
| 3. Estimativa | **Falta.** A ortografia é irregular demais para regras simples: treinar o G2P (dados CC BY, sem compartilhamento pela mesma licença) |
| 4. Gabarito | 100 linhas revisadas, 100% de acerto |
| 5. Site | **Não ativado**, por causa da cobertura do passo 1 |

O próximo passo do holandês é treinar o modelo (~45 min no Mac) e ativar quando a estimativa cobrir as palavras básicas. O sueco está na mesma situação: cobertura de 82,6%, gabarito revisado.
