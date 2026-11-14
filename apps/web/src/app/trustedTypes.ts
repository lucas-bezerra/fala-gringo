/**
 * Política "default" de Trusted Types (T6.2). Com `require-trusted-types-for 'script'` na CSP, todo sink perigoso
 * passa por aqui:
 * - URL de script (new Worker, registro do service worker): só da própria origem;
 * - HTML e código (innerHTML, eval…): sem método = bloqueado. O site não usa nenhum dos dois.
 * Importe ANTES de qualquer outro módulo do app. Navegadores sem Trusted Types ignoram (a CSP também).
 */
interface TrustedTypesFactory {
  createPolicy(name: string, rules: { createScriptURL?: (url: string) => string }): unknown;
}

const tt = (globalThis as { trustedTypes?: TrustedTypesFactory }).trustedTypes;

tt?.createPolicy('default', {
  createScriptURL(url) {
    const parsed = new URL(url, window.location.href);
    if (parsed.origin !== window.location.origin) {
      throw new TypeError(`Script de outra origem bloqueado: ${parsed.origin}`);
    }
    return parsed.href;
  },
});
