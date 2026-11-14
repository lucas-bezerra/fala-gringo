# FalaGringo

Mostra a um falante de português brasileiro **como pronunciar palavras estrangeiras**, escritas com a grafia do português: `think` → **TH**ÉNK, `Worcester` → U·ster. Para cada palavra, mostra a transcrição IPA (tirada de dicionários abertos), a aproximação em PT-BR com a tônica em MAIÚSCULAS, os sons que não existem em português destacados em laranja e o detalhe som a som.

Hoje o site oferece **inglês dos EUA e do Reino Unido**. Outros idiomas estão no plano (Fase 5).

## Funções

- **Traduzir:** digite ou cole até 2.000 caracteres. Clique numa palavra para ver o som a som, as variantes e ouvir a voz sintética do navegador.
- **Modo apresentador:** teleprompter com o roteiro em português. Os nomes estrangeiros ganham a leitura em amarelo acima deles.
- **Uso offline:** baixe um idioma e use sem internet. O site também pode ser instalado como aplicativo (PWA).
- **Recentes, favoritos e link compartilhável**, tudo guardado só no navegador. O texto do link vai no fragmento da URL e não chega ao servidor.

## Rodar localmente

Requisitos: Node.js 20 ou superior e pnpm 11.

```bash
pnpm install
pnpm dev        # http://localhost:5173 (gera os dados na 1ª vez, ~40 s)
pnpm build      # site estático em apps/web/dist
pnpm preview    # serve o build (com service worker e cabeçalhos de produção)
```

Verificações (as mesmas do CI):

```bash
pnpm lint && pnpm typecheck && pnpm test   # lint, tipos e testes unitários (inclui o golden set da notação)
pnpm test:golden                           # acerto do motor por idioma
pnpm build && pnpm budget                  # orçamento de tamanho
pnpm test:e2e                              # Playwright: telas, acessibilidade, segurança, offline e desempenho
```

## Estrutura

```
apps/web/          site (React 19 + Vite 6 + Tailwind 4), motor num Web Worker, PWA
packages/engine/   motor fonético: tokenizador, parser de IPA, silabação, regras IPA → PT-BR
packages/data/     dicionários versionados, importadores, merge e shards
packages/content/  dicas e guia de sons (em preparação)
tools/g2p/         treino do modelo de estimativa (experimental)
docs/              plano, notação, ADRs, acessibilidade, segurança, desempenho e deploy
```

Para desenvolver, comece por [CLAUDE.md](CLAUDE.md) (guia do repositório) e pelo [plano](docs/PLANO-V2.md).

## Documentação

| Documento | Assunto |
|---|---|
| [docs/notacao.md](docs/notacao.md) | Especificação da grafia PT-BR |
| [docs/PLANO-V2.md](docs/PLANO-V2.md) | Fases e tarefas |
| [docs/deploy.md](docs/deploy.md) | Publicação e cabeçalhos |
| [docs/seguranca.md](docs/seguranca.md) | Modelo de ameaças e controles |
| [docs/acessibilidade.md](docs/acessibilidade.md) | Auditoria WCAG 2.2 AA |
| [docs/desempenho.md](docs/desempenho.md) | Orçamento de desempenho |
| [packages/data/SOURCES.md](packages/data/SOURCES.md) | Fontes de dados e licenças |

## Dados e licenças

Só entram fontes abertas com licença compatível: CMUdict (BSD), Britfone (MIT), Wiktionary e WikiPron (CC BY-SA 4.0), Wikidata (CC0), ipa-dict e outras. Os créditos completos estão na página **Fontes e créditos** do site e em [packages/data/NOTICE.md](packages/data/NOTICE.md). O uso declarado é interno, individual e sem fins lucrativos; se isso mudar, as licenças precisam ser revistas.

## Aviso

As pronúncias são **aproximações automáticas**. Qualquer uso em conteúdo publicado ou no ar exige revisão humana. Projeto interno da Rede Gazeta, sujeito à Política de Uso Ético e Seguro de IA. Incidentes devem ser reportados a governanca@redegazeta.com.br.
