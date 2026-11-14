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
];

export const DEFAULT_LANG: Lang = 'en-US';

export function groupOf(lang: Lang): LangGroup {
  return LANG_GROUPS.find((g) => g.variants.some((v) => v.lang === lang)) ?? LANG_GROUPS[0]!;
}
