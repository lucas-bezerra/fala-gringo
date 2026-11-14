import { useSyncExternalStore } from 'react';

/** Rotas por hash: funcionam em qualquer hospedagem estática, sem configurar o servidor. */
export type Route = 'traduzir' | 'apresentar' | 'creditos';

export const ROUTE_HREF: Record<Route, string> = {
  traduzir: '#/',
  apresentar: '#/apresentar',
  creditos: '#/creditos',
};
export const ROUTE_TITLE: Record<Route, string> = {
  traduzir: 'FalaGringo — Como pronunciar',
  apresentar: 'Modo apresentador — FalaGringo',
  creditos: 'Fontes e créditos — FalaGringo',
};

function current(): Route {
  const hash = window.location.hash;
  return hash === ROUTE_HREF.apresentar
    ? 'apresentar'
    : hash === ROUTE_HREF.creditos
      ? 'creditos'
      : 'traduzir';
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
