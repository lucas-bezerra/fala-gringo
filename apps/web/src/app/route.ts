import { useSyncExternalStore } from 'react';

/** Rotas por hash: funcionam em qualquer hospedagem estática, sem configurar o servidor. */
export type Route = 'traduzir' | 'apresentar';

export const ROUTE_HREF: Record<Route, string> = { traduzir: '#/', apresentar: '#/apresentar' };
export const ROUTE_TITLE: Record<Route, string> = {
  traduzir: 'FalaGringo — Como pronunciar',
  apresentar: 'Modo apresentador — FalaGringo',
};

function current(): Route {
  return window.location.hash === ROUTE_HREF.apresentar ? 'apresentar' : 'traduzir';
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('hashchange', onChange);
      return () => window.removeEventListener('hashchange', onChange);
    },
    current,
    () => 'traduzir',
  );
}
