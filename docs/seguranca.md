# Segurança — revisão da T6.2

Revisão feita em 2026-11-14 sobre o build de produção. O FalaGringo é um site **100% estático**: não tem backend, login, banco de dados nem coleta de dados. O que precisa de proteção:

1. **Quem usa o site:** contra XSS e contra embutir o site em outra página.
2. **O texto digitado**, que pode ser pauta não publicada: ele não deve sair do navegador.
3. **A integridade do código e dos dados servidos:** cadeia de suprimentos e cache.

## Controles

| Área | Controle | Verificação |
|---|---|---|
| XSS | CSP `default-src 'none'`, scripts só da própria origem, sem `unsafe-inline`/`unsafe-eval`/`data:` | `e2e/seguranca.spec.ts` |
| XSS baseado em DOM | **Trusted Types** (`require-trusted-types-for 'script'`): `innerHTML`, `eval` e afins bloqueados; URL de script só da própria origem (política `default` em `src/app/trustedTypes.ts`) | e2e: `innerHTML` → `TypeError`; worker de outra origem bloqueado |
| XSS (código) | React escapa tudo; nenhum `dangerouslySetInnerHTML`, `innerHTML` ou `eval` no código | busca no código (revisão) |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | e2e |
| Vazamento entre origens | `Cross-Origin-Opener-Policy` e `Cross-Origin-Resource-Policy: same-origin`, `Referrer-Policy: no-referrer` | e2e |
| Permissões do navegador | `Permissions-Policy` nega câmera, microfone, localização, pagamento, USB, sensores e *topics* | e2e |
| Privacidade do texto | O texto fica no navegador (o motor roda num Web Worker local). O link compartilhado leva o texto no **fragmento** (`#/?t=`), que nunca vai ao servidor nem aos logs | e2e: nenhuma requisição carrega o texto |
| Dados locais | Recentes e favoritos só no `localStorage` do aparelho, apagáveis na tela; nada é enviado | revisão |
| Service worker | Só requisições GET da própria origem; dicionários em CacheFirst só com status 200 (nunca respostas opacas); runtime do Workbox embutido (sem `importScripts`); `sw.js` em `no-cache`; versão nova só com o clique em "Atualizar" | e2e offline e de segurança |
| Cache HTTP | Arquivos com hash: imutáveis. `dict/manifest.json`, `sw.js` e `manifest.webmanifest`: `no-cache` | e2e + `_headers` |
| Cadeia de suprimentos (npm) | `pnpm audit --audit-level high` no CI; `--frozen-lockfile`; builds de pacotes só para o `esbuild` (`allowBuilds`); overrides para `glob` e `minimatch`; Dependabot semanal | CI |
| Cadeia de suprimentos (CI) | Actions fixadas por **SHA**; permissões mínimas (`contents: read` no CI); `persist-credentials: false` no CI; o workflow de dados só abre PR (revisão humana) | revisão |
| Deploy | `_headers` gerado do código; snippet do Nginx conferido por teste (`deploy-sync.test.ts`) | CI |

## Riscos aceitos

| Risco | Por que é aceito | Revisar quando |
|---|---|---|
| `deepmerge` ≤ 4.3.1 (baixo, poluição de protótipo), dentro do `workbox-build` | Só roda no build, com configuração nossa; a versão corrigida (4.3.2) ainda não foi publicada | O Dependabot avisar |
| Firefox e Safari sem Trusted Types | A diretiva é ignorada onde não existe; a CSP e o React continuam protegendo | — |
| O workflow mensal de dados tem permissão de escrita e baixa dados externos (Wikidata, kaikki.org) | O resultado vira PR e só entra com revisão humana; o código não executa os dados | Se o workflow passar a mergear sozinho (não deve) |
| O `page.evaluate` do Playwright é isento da CSP | Por isso o teste confere a ausência de `unsafe-eval` no cabeçalho, em vez de tentar um `eval` | — |

## Ao mudar algo

- **Recurso novo bloqueado pela CSP:** ajuste em `apps/web/security-headers.ts` (fonte única) e rode `pnpm test` (sincronia do Nginx) e `pnpm test:e2e`.
- **Novo uso de `innerHTML`/`new Worker`/script dinâmico:** passa pela política `default`. Nunca acrescente `createHTML` a ela sem uma revisão.
- **Analytics ou monitoramento de erros (T6.6):** não pode enviar o texto digitado. Com dados pessoais, é preciso validar com o DPO.
- **Incidentes** (vazamento, uso indevido): reportar a governanca@redegazeta.com.br.
