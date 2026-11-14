/**
 * Fonte única dos cabeçalhos de segurança (T1.5).
 *
 * Aplicados em três lugares, todos gerados a partir daqui:
 *  1. `dist/_headers` — Cloudflare Pages / Netlify (hospedagem recomendada);
 *  2. `<meta http-equiv="Content-Security-Policy">` no build — vale em qualquer hospedagem estática;
 *  3. `vite preview` — para os testes E2E rodarem sob a mesma política de produção.
 * Equivalente para Nginx: docs/deploy.md.
 *
 * Ao adicionar um recurso que a CSP bloqueie (worker, manifest PWA etc.), ajuste AQUI e rode `pnpm test:e2e`.
 */
import type { Plugin } from 'vite';

const CSP_DIRECTIVES: Record<string, string> = {
  // T6.2: nega tudo por padrão e libera só o que o site usa (tudo da própria origem)
  'default-src': "'none'",
  'script-src': "'self'",
  'style-src': "'self'",
  'img-src': "'self'",
  'font-src': "'self'",
  'connect-src': "'self'",
  'worker-src': "'self'",
  'manifest-src': "'self'",
  'object-src': "'none'",
  'base-uri': "'none'",
  'form-action': "'none'",
  // Trusted Types: sinks de HTML/script (innerHTML, eval, new Worker, register do SW…) só aceitam valores de
  // uma política. A única é a "default" (src/app/trustedTypes.ts): libera URL de script da própria origem.
  'require-trusted-types-for': "'script'",
  'trusted-types': 'default',
  // As diretivas abaixo são ignoradas em <meta>; valem só como cabeçalho HTTP.
  'frame-ancestors': "'none'",
  'upgrade-insecure-requests': '',
};

const HEADER_ONLY = new Set(['frame-ancestors']);

function serializeCsp(forMeta: boolean): string {
  return Object.entries(CSP_DIRECTIVES)
    .filter(([name]) => !(forMeta && HEADER_ONLY.has(name)))
    .map(([name, value]) => (value ? `${name} ${value}` : name))
    .join('; ');
}

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': serializeCsp(false),
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/** Cabeçalhos para `vite preview`. Sem HSTS (o preview é HTTP local). */
export const PREVIEW_HEADERS: Record<string, string> = Object.fromEntries(
  Object.entries(SECURITY_HEADERS).filter(([name]) => name !== 'Strict-Transport-Security'),
);

function renderHeadersFile(): string {
  const block = (path: string, headers: Record<string, string>) =>
    [path, ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`)].join('\n');
  return [
    block('/*', SECURITY_HEADERS),
    block('/assets/*', { 'Cache-Control': 'public, max-age=31536000, immutable' }),
    // shards e léxico têm hash no nome: nunca mudam. O manifest dos dados não tem: precisa revalidar sempre.
    block('/dict/*/*', { 'Cache-Control': 'public, max-age=31536000, immutable' }),
    block('/dict/pt-BR-lexicon.*', { 'Cache-Control': 'public, max-age=31536000, immutable' }),
    block('/dict/manifest.json', { 'Cache-Control': 'no-cache' }),
    // service worker (T4.8): o navegador precisa ver a versão nova logo
    block('/sw.js', { 'Cache-Control': 'no-cache' }),
    block('/manifest.webmanifest', { 'Cache-Control': 'no-cache' }),
    '',
  ].join('\n\n');
}

const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * Regras do Render (T6.6) no formato do Blueprint (`render.yaml`, campo `headers`).
 * A documentação do Render não diz qual regra vence quando duas casam com o mesmo cabeçalho, então as regras de
 * cache NÃO se sobrepõem: `/dict/**\/*.json` só pega arquivos em subpastas (shards), nunca o `/dict/manifest.json`.
 * Confira no ar com `pnpm check:deploy <url>`.
 */
export const RENDER_HEADER_RULES: { path: string; name: string; value: string }[] = [
  ...Object.entries(SECURITY_HEADERS).map(([name, value]) => ({ path: '/*', name, value })),
  { path: '/assets/*', name: 'Cache-Control', value: IMMUTABLE },
  { path: '/dict/**/*.json', name: 'Cache-Control', value: IMMUTABLE },
  { path: '/dict/*.txt', name: 'Cache-Control', value: IMMUTABLE },
  { path: '/dict/manifest.json', name: 'Cache-Control', value: 'no-cache' },
  { path: '/sw.js', name: 'Cache-Control', value: 'no-cache' },
  { path: '/manifest.webmanifest', name: 'Cache-Control', value: 'no-cache' },
];

/** Conteúdo do render.yaml (Blueprint). Gerado: `pnpm render:yaml`; o teste deploy-sync falha se divergir. */
export function renderBlueprint(): string {
  const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
  const headers = RENDER_HEADER_RULES.map(
    (h) => `      - path: ${q(h.path)}\n        name: ${q(h.name)}\n        value: ${q(h.value)}`,
  ).join('\n');
  return `# GERADO por apps/web/security-headers.ts (renderBlueprint). Não edite à mão: rode \`pnpm render:yaml\`.
# Site estático no Render (T6.6). Passo a passo em docs/deploy.md.
services:
  - type: web
    name: falagringo
    runtime: static
    branch: master
    # só publica depois que o CI do commit passar
    autoDeployTrigger: checksPass
    # o pipeline de dados (~40 s) roda dentro do build: os dicionários são gerados a partir de raw/
    buildCommand: corepack enable && pnpm install --frozen-lockfile && pnpm build
    staticPublishPath: ./apps/web/dist
    envVars:
      - key: NODE_VERSION
        value: '22'
    headers:
${headers}
`;
}

export function securityHeaders(): Plugin {
  return {
    name: 'falagringo:security-headers',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: serializeCsp(true) },
        injectTo: 'head-prepend',
      },
      { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' },
    ],
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: renderHeadersFile() });
    },
  };
}
