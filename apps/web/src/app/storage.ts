import { useCallback, useState } from 'react';

/** localStorage com tolerância a falhas (aba anônima, cota cheia): nada aqui é essencial. Nada sai do navegador. */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: segue sem lembrar */
  }
}

const RECENT = 'fg:recentes';
const FAVORITES = 'fg:favoritos';
const MAX_RECENT = 8;
const MAX_FAVORITES = 30;

/** Textos recentes e favoritos (T4.9), guardados só neste navegador. */
export function useSavedTexts() {
  const [recent, setRecent] = useState<string[]>(() => load(RECENT, []));
  const [favorites, setFavorites] = useState<string[]>(() => load(FAVORITES, []));

  const addRecent = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setRecent((list) => {
      const next = [t, ...list.filter((x) => x !== t)].slice(0, MAX_RECENT);
      save(RECENT, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    setFavorites((list) => {
      const next = list.includes(t) ? list.filter((x) => x !== t) : [t, ...list].slice(0, MAX_FAVORITES);
      save(FAVORITES, next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    save(RECENT, undefined);
  }, []);

  return { recent, favorites, addRecent, toggleFavorite, clearRecent };
}
