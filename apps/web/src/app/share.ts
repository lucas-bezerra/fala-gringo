import type { Lang } from '@falagringo/engine';
import { LANG_GROUPS } from '@/engine/langs';

/** Link compartilhável (T4.9): ?t=<texto>&l=<idioma>. O texto só sai do navegador se o usuário enviar o link. */
export function shareUrl(text: string, lang: Lang): string {
  const url = new URL(window.location.href);
  url.search = new URLSearchParams({ t: text, l: lang }).toString();
  url.hash = '#/';
  return url.toString();
}

export function readShared(): { text?: string; lang?: Lang } {
  const params = new URLSearchParams(window.location.search);
  const l = params.get('l');
  const lang = LANG_GROUPS.flatMap((g) => g.variants).find((v) => v.lang === l)?.lang;
  const t = params.get('t');
  return { text: t ? t.slice(0, 2000) : undefined, lang };
}
