# Acessibilidade — auditoria da Fase 4 (T4.11)

Meta: WCAG 2.2 nível AA. Auditoria feita em 2026-11-14, sobre o build de produção.

## O que é verificado automaticamente (CI)

| Verificação | Onde | Cobertura |
|---|---|---|
| axe-core (WCAG 2.2 A/AA + boas práticas) | `e2e/acessibilidade.spec.ts` | 4 telas × tema claro/escuro × 1280 e 390 px (16 combinações) |
| axe com sobreposições abertas | `componentes`, `detalhe`, `offline`, `apresentador` | Popover, painel inferior, painel lateral, roteiro aberto |
| Reflow a 320 px sem rolagem horizontal (1.4.10) | `acessibilidade.spec.ts` | 4 telas |
| Contraste dos tokens (1.4.3 e 1.4.11) | `apps/web/src/a11y/contrast.test.ts` | Texto, foco, bordas de campo e estados de hover, nos dois temas |
| Teclado: link de pular, ordem do Tab, foco visível | `acessibilidade.spec.ts` | Tela Traduzir inteira, do topo ao rodapé |
| Nome acessível da pronúncia e `lang` das palavras estrangeiras | `acessibilidade.spec.ts` | Cartões, painel de detalhe, apresentador |
| Componentes (abas, segmentado, chip, popover, painel, aviso) | `componentes.spec.ts` | Teclado, foco e devolução de foco |

## Problemas achados e corrigidos nesta auditoria

| Problema | Critério | Correção |
|---|---|---|
| Leitor de tela lia "THÉNK" (pode soletrar) e o IPA símbolo por símbolo | 1.1.1 / uso real | Versão falada em minúsculas com a tônica por extenso ("uatching, tônica em ua"); grafia visual e IPA dos cartões escondidos do leitor de tela |
| Palavras em inglês lidas com a voz do português | 3.1.2 | `lang` na palavra original (cartões, detalhe, painel inferior, apresentador) |
| Contorno de foco `#93c5fd` sobre branco: 1,9:1 | 1.4.11 / 2.4.7 | Foco `#2563eb` no tema claro (≥ 3:1); `#93c5fd` continua no escuro |
| Borda da caixa de texto: ~1,2:1 (o campo "some") | 1.4.11 | Token `field` (≥ 3:1 nos dois temas); roteiro do apresentador também |
| Sem link para pular a navegação | 2.4.1 | "Pular para o conteúdo" (primeiro Tab de cada tela) |
| Barra do apresentador fora de qualquer região | boa prática (região) | Virou `<header>` |
| Apresentador com rolagem horizontal no celular ("Massachusetts" a 64 px) | 1.4.10 | Tamanho limitado a 10vw; quebra de palavra como último recurso |
| Botões A−/A+ com nome diferente do texto visível (achado na T4.7) | 2.5.3 | Nome começa pelo texto visível |

## Verificação manual pendente 👤

Ferramentas automáticas não substituem um leitor de tela de verdade. Antes de considerar a Fase 4 encerrada, alguém deve fazer este roteiro (cerca de 20 minutos):

**VoiceOver (macOS, Safari)**: Cmd+F5 liga. **NVDA (Windows, Firefox ou Chrome)**: gratuito em nvaccess.org.

1. Abrir a tela Traduzir. O primeiro Tab deve anunciar "Pular para o conteúdo".
2. Digitar "thank you". Navegar até os cartões: deve ouvir "thank" **em inglês** e depois "thénk" em português, e o estado "pressionado"/"não pressionado".
3. Abrir "watching": deve ouvir "uatching, tônica em ua", sem soletrar.
4. Abrir o detalhe no celular (painel inferior): o foco deve ir para o painel, e Esc deve voltar ao cartão.
5. Copiar a leitura: o aviso "Leitura copiada" deve ser anunciado sem mover o foco.
6. Modo apresentador: navegar pelo roteiro e ouvir "Worcester (leia: uster, tônica em u)".
7. Uso offline: baixar um idioma e ouvir o progresso ("Baixando… 3 de 6") e o fim ("Disponível offline").
8. Zoom do navegador em 200% e 400%: nada cortado, nada sobreposto.

Anotar aqui o resultado (data, leitor, navegador, problemas).

| Data | Leitor / navegador | Resultado |
|---|---|---|
| — | — | pendente |

## Limites conhecidos

- **Áudio:** depende das vozes instaladas no sistema. Sem voz, o botão é desativado e o motivo é dito (não é um erro).
- **Popover em navegadores antigos** (antes de Chrome 114, Safari 17, Firefox 125): o conteúdo aparece fora da camada superior ([ADR 0003](adr/0003-componentes-nativos.md)).
- **IPA:** no painel de detalhe, ele continua acessível, com o prefixo "Transcrição IPA", para quem quiser. Cada leitor de tela lê os símbolos de um jeito.
