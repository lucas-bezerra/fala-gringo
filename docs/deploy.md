# Deploy

O FalaGringo é um site **100% estático**. O build gera `apps/web/dist/`, e qualquer hospedagem de arquivos serve.

```bash
pnpm install --frozen-lockfile
pnpm build          # → apps/web/dist (inclui _headers e a CSP no <meta>)
```

## Cabeçalhos de segurança

A fonte única é [apps/web/security-headers.ts](../apps/web/security-headers.ts). O build aplica a política de duas formas:

| Mecanismo | Onde vale | Cobertura |
|---|---|---|
| `render.yaml` (Blueprint, na raiz) | **Render (hospedagem escolhida)** | Completa. Gerado por `pnpm render:yaml`; o teste `deploy-sync` falha se divergir |
| `dist/_headers` | Cloudflare Pages, Netlify | Completa: CSP, HSTS, X-Frame-Options, cache etc. |
| `<meta http-equiv="Content-Security-Policy">` | Qualquer hospedagem | Só a CSP, e sem `frame-ancestors` (o navegador ignora essa diretiva em `<meta>`) |

O teste E2E `roda sob a CSP de produção…` falha se a página violar a CSP ou fizer qualquer requisição a outro domínio.

## Opções de hospedagem

### Render (escolhida em 2026-11-14)

Site estático gratuito. A configuração inteira está no [render.yaml](../render.yaml): build, pasta publicada, Node 22 e os cabeçalhos de segurança e de cache.

**Primeira publicação (uma vez):**

1. Em render.com, entre com a conta do GitHub que tem acesso ao repositório.
2. **New → Blueprint**, escolha o repositório `fala-gringo` e a branch `master`. O Render lê o `render.yaml` e mostra o serviço `falagringo` (site estático). Confirme.
3. Espere o primeiro build. Ele leva de 2 a 3 minutos, porque gera os dicionários a partir de `raw/`.
4. Anote o endereço (`https://falagringo….onrender.com`) e rode, no seu computador:
   ```bash
   pnpm check:deploy https://<endereço>
   ```
   Todas as verificações precisam passar: CSP, HSTS, cache de cada tipo de arquivo, compressão e service worker.
5. Monitoramento diário (abaixo): em GitHub → Settings → Secrets and variables → Actions → **Variables**, crie `SITE_URL` com o endereço.

**Dia a dia:**

- Cada merge na `master` publica sozinho, **depois que o CI do commit passar** (`autoDeployTrigger: checksPass`). Confira no painel do serviço (Settings → Build & Deploy) se a opção ficou como "After CI checks pass".
- Mudou `security-headers.ts`? Rode `pnpm render:yaml` e faça commit do `render.yaml`. Ao sincronizar o Blueprint, o Render aplica as regras novas. Regras criadas à mão no painel e ausentes do arquivo **são mantidas**: apague-as no painel se sobrarem.
- A documentação do Render não diz qual regra de cabeçalho vence quando duas casam com o mesmo arquivo. Por isso as regras de cache do `render.yaml` não se sobrepõem. O `check:deploy` confere o resultado real.

### Cloudflare Pages / Netlify (alternativa)

- Comando de build: `pnpm build`
- Diretório de saída: `apps/web/dist`
- Node: 22

O `_headers` é aplicado automaticamente.

### Vercel

O Vercel não lê o `_headers`; seria preciso um `vercel.json`, que não existe. Além disso, o plano gratuito (Hobby) é só para uso pessoal e não comercial. Uma ferramenta interna de empresa provavelmente exige o plano pago.

### GitHub Pages

Não permite cabeçalhos HTTP. Vale só a CSP via `<meta>`. Sem HSTS, sem proteção contra embutir o site em `<iframe>` (X-Frame-Options e `frame-ancestors`) e sem controle de cache.

### Nginx (servidor próprio)

Equivalente ao `_headers`. **Mantenha em sincronia com `security-headers.ts`**: o teste `apps/web/src/security/deploy-sync.test.ts` falha se o snippet abaixo divergir.

`/etc/nginx/snippets/falagringo-security.conf`:

```nginx
    add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; require-trusted-types-for 'script'; trusted-types default; frame-ancestors 'none'; upgrade-insecure-requests" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), browsing-topics=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
```

Site:

```nginx
server {
    listen 443 ssl http2;
    server_name falagringo.exemplo;           # ajustar
    root /var/www/falagringo/dist;            # conteúdo de apps/web/dist

    include /etc/nginx/snippets/falagringo-security.conf;

    location /assets/ {
        include /etc/nginx/snippets/falagringo-security.conf;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    # shards e léxico têm hash no nome; o manifest dos dados não tem e precisa revalidar
    location /dict/ {
        include /etc/nginx/snippets/falagringo-security.conf;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    location = /dict/manifest.json {
        include /etc/nginx/snippets/falagringo-security.conf;
        add_header Cache-Control "no-cache" always;
    }

    # service worker e manifest do PWA (T4.8): sem cache, para a versão nova chegar logo
    location ~ ^/(sw\.js|manifest\.webmanifest)$ {
        include /etc/nginx/snippets/falagringo-security.conf;
        add_header Cache-Control "no-cache" always;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

> No Nginx, um `add_header` dentro de `location` **descarta** todos os herdados do `server`. Por isso cada `location` que define cache inclui o snippet de segurança de novo.

## Checklist depois de publicar

0. `pnpm check:deploy https://<endereço>`: tudo ✅.
1. Abrir o site e conferir os cabeçalhos em https://securityheaders.com (meta da T1.5: nota A).
2. Console do navegador sem erros de CSP.
3. Converter uma frase (prova de que o dicionário carregou).
4. Abrir **Uso offline**, baixar um idioma, ativar o modo avião e converter de novo (prova do service worker). O PWA exige HTTPS (ou `localhost`).
5. Instalar como app (no celular: "Adicionar à tela inicial") e abrir sem internet.

## Monitoramento (sem dados pessoais)

**Não há telemetria no navegador:** nenhum analytics, rastreio de erros ou registro de uso. Isso evitaria um serviço externo, uma mudança na CSP e o risco de capturar o texto digitado (LGPD). Para incluir algo assim no futuro, são obrigatórios a validação com o DPO e um serviço que nunca receba o texto.

O que existe:

| O quê | Como | Cobertura |
|---|---|---|
| Qualidade antes de publicar | CI (lint, tipos, testes, golden sets, e2e de telas, acessibilidade, segurança e desempenho, orçamento de tamanho) | Cada PR; o Render só publica com o CI verde |
| Site no ar e bem configurado | Workflow `monitor.yml`: roda `check:deploy` contra `SITE_URL` todo dia | Disponibilidade, cabeçalhos, cache, compressão, dados e service worker. Falha → e-mail do GitHub para quem acompanha o repositório |
| Erros de quem usa | Relato direto (canal interno da equipe) | — |

Incidentes de segurança ou de privacidade: governanca@redegazeta.com.br.

