import type { Lang } from '@falagringo/engine';
import { LANG_GROUPS } from '@/engine/langs';

/**
 * Link compartilhável (T4.9): #/?t=<texto>&l=<idioma>.
 * Os parâmetros vão no FRAGMENTO (depois do #), que o navegador nunca envia ao servidor: o texto não aparece
 * em logs de hospedagem nem de proxy (T6.2, minimização de dados da LGPD). O formato antigo (?t=…) ainda é lido.
 */
export function shareUrl(text: string, lang: Lang): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = `#/?${new URLSearchParams({ t: text, l: lang }).toString()}`;
  return url.toString();
}

export function readShared(): { text?: string; lang?: Lang } {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.startsWith('#/?') ? hash.slice(3) : window.location.search);
  const l = params.get('l');
  const lang = LANG_GROUPS.flatMap((g) => g.variants).find((v) => v.lang === l)?.lang;
  const t = params.get('t');
  return { text: t ? t.slice(0, 2000) : undefined, lang };
}
