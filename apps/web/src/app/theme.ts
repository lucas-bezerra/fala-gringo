import { load, save } from './storage';

/** Tema (T4.10): "system" segue o sistema operacional; claro/escuro forçam via data-theme no <html>. */
export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'fg:tema';

export function readTheme(): ThemePref {
  const v = load<string>(KEY, 'system');
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
  save(KEY, pref === 'system' ? undefined : pref);
}
