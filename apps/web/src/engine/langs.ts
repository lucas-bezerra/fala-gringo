import type { Lang } from '@falagringo/engine';

/** Idiomas que o site oferece. Manter em sincronia com ACTIVE em packages/data/scripts/sync-web.mjs. */
export interface LangGroup {
  code: string;
  label: string;
  /** "Texto em …" */
  inLabel: string;
  variants: readonly { lang: Lang; label: string }[];
}

export const LANG_GROUPS: readonly LangGroup[] = [
  {
    code: 'EN',
    label: 'Inglês',
    inLabel: 'inglês',
    variants: [
      { lang: 'en-US', label: 'EUA' },
      { lang: 'en-GB', label: 'Reino Unido' },
    ],
  },
  {
    code: 'ES',
    label: 'Espanhol',
    inLabel: 'espanhol',
    variants: [
      { lang: 'es-419', label: 'América Latina' },
      { lang: 'es-ES', label: 'Espanha' },
    ],
  },
  { code: 'FR', label: 'Francês', inLabel: 'francês', variants: [{ lang: 'fr-FR', label: 'França' }] },
  { code: 'IT', label: 'Italiano', inLabel: 'italiano', variants: [{ lang: 'it-IT', label: 'Itália' }] },
  { code: 'DE', label: 'Alemão', inLabel: 'alemão', variants: [{ lang: 'de-DE', label: 'Alemanha' }] },
];

export const DEFAULT_LANG: Lang = 'en-US';

export function groupOf(lang: Lang): LangGroup {
  return LANG_GROUPS.find((g) => g.variants.some((v) => v.lang === lang)) ?? LANG_GROUPS[0]!;
}
