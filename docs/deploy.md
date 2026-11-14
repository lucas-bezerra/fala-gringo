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
| `dist/_headers` | Cloudflare Pages, Netlify | Completa: CSP, HSTS, X-Frame-Options, cache etc. |
| `<meta http-equiv="Content-Security-Policy">` | Qualquer hospedagem | Só a CSP, e sem `frame-ancestors` (o navegador ignora essa diretiva em `<meta>`) |

O teste E2E `roda sob a CSP de produção…` falha se a página violar a CSP ou fizer qualquer requisição a outro domínio.

## Opções de hospedagem

### Cloudflare Pages / Netlify (recomendado)

- Comando de build: `pnpm build`
- Diretório de saída: `apps/web/dist`
- Node: 22

O `_headers` é aplicado automaticamente.

### Vercel

O Vercel não lê o `_headers`. Seria preciso um `vercel.json` com os mesmos cabeçalhos, que ainda não existe.

### GitHub Pages

Não permite cabeçalhos HTTP. Vale só a CSP via `<meta>`. Sem HSTS, sem proteção contra embutir o site em `<iframe>` (X-Frame-Options e `frame-ancestors`) e sem controle de cache.

### Nginx (servidor próprio)

Equivalente ao `_headers`. **Mantenha em sincronia com `security-headers.ts`** se a política mudar.

`/etc/nginx/snippets/falagringo-security.conf`:

```nginx
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
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

1. Abrir o site e conferir os cabeçalhos em https://securityheaders.com (meta da T1.5: nota A).
2. Console do navegador sem erros de CSP.
3. Converter uma frase (prova de que o dicionário carregou).
4. Abrir **Uso offline**, baixar um idioma, ativar o modo avião e converter de novo (prova do service worker). O PWA exige HTTPS (ou `localhost`).
