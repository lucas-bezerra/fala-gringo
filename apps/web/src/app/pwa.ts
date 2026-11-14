import { registerSW } from 'virtual:pwa-register';

/**
 * Registra o service worker (só no build; no `pnpm dev` não faz nada). Quando há versão nova do site,
 * chama `onUpdate` com a função que a aplica (recarrega a página).
 */
export function setupPwa(onUpdate: (apply: () => void) => void): void {
  if (!('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh: () => onUpdate(() => void update(true)),
  });
}
