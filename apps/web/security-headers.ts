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
  'default-src': "'self'",
  'script-src': "'self'",
  'style-src': "'self'",
  'img-src': "'self'",
  'font-src': "'self'",
  'connect-src': "'self'",
  'worker-src': "'self'",
  'manifest-src': "'self'",
  'object-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'none'",
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
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
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
    block('/dict/*', { 'Cache-Control': 'public, max-age=86400' }),
    '',
  ].join('\n\n');
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
