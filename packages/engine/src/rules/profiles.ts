/**
 * Perfis por idioma (notação, seção 6). Vêm ANTES do núcleo comum: a primeira regra que casa vence.
 * Ponto de partida da T3.5 — afinados com golden sets na T3.7 (inglês) e na Fase 5 (demais idiomas).
 */
import type { Lang } from '../types';
import type { MapRule, Profile } from './dsl';

/** Inglês americano: sem flap antes de "n" silábico (Biden, button, sudden: [dn̩], [ʔn̩]). Vem antes do flap. */
const EN_US_NO_FLAP: MapRule = {
  id: 'en-us-sem-flap-antes-de-n',
  match: ['t', 'd'],
  when: { after: ['ə', 'n'] },
  out: (c) => c.phone.base,
};

/** Inglês americano: flap — t/d entre vogais, no início de sílaba átona, soa como o r de "caro" (water, city). */
const EN_US_FLAP: MapRule = {
  id: 'en-us-flap',
  match: ['t', 'd'],
  when: { slot: 'onset', stressed: false, prev: ['@vowel', 'ɹ'], next: '@vowel' },
  out: 'r',
};

/** Inglês: algumas fontes escrevem o r inglês como "r" (em vez de ɹ) — é o mesmo som, não a vibrante. */
const EN_R: MapRule = { id: 'en-r', match: 'r', out: 'r', special: true };

/**
 * Italiano. O Wiktionary escreve todo /r/ como "r": simples (depois de consoante, entre vogais) é batido, como em
 * "caro"; geminado (rr) é a vibrante 🟧; inicial, como no núcleo. Geminadas em geral: a 1ª consoante some
 * (gnocchi → NHÓ·ki; o ss é refeito pela R6).
 */
const IT_RULES: readonly MapRule[] = [
  { id: 'it-geminada', match: '@consonant', when: { geminate: true }, out: '' },
  { id: 'it-rr', match: 'r', when: { prev: 'r' }, out: 'rr', special: true },
  { id: 'it-r-inicial', match: 'r', when: { wordInitial: true }, out: 'r', special: true },
  { id: 'it-r', match: 'r', out: 'r' },
];

/** Espanhol: β ð ɣ são alofones de b d g — sem destaque (notação 6). */
const ES_RULES: readonly MapRule[] = [{ id: 'es-ð', match: 'ð', out: 'd' }];

/** Japonês. Vogal longa = vogal dobrada, a 2ª sem acento ("tôo", "raa"); vogal desvozeada = "(u)" 🟧. */
const JA_RULES: readonly MapRule[] = [
  { id: 'ja-desvozeada', match: ['ɯ̥', 'i̥'], out: (c) => `(${c.plain(c.phone.base)})`, special: true },
  {
    id: 'ja-vogal-longa',
    match: '@vowel',
    with: ['long'],
    out: (c) => {
      const v = c.plain(c.phone.base);
      return v + v.normalize('NFD').replace(/\p{M}/gu, '').slice(-1);
    },
  },
  // ç é o h antes de i ("hito" [çito]): r forte, como o h
  { id: 'ja-ç-inicial', match: 'ç', when: { wordInitial: true }, out: 'r' },
  { id: 'ja-ç', match: 'ç', out: 'rr' },
];

/** Coreano: ʌ → ó 🟧; ɯ → u 🟧; tensas → consoante dobrada 🟧; aspiradas → letra simples 🟧. */
const KO_RULES: readonly MapRule[] = [
  { id: 'ko-ʌ', match: 'ʌ', out: 'ó', special: true },
  { id: 'ko-ɯ', match: 'ɯ', out: 'u', special: true },
  { id: 'ko-tensa-africada', match: 't͡ɕ', with: ['fortis'], out: 'tch', special: true },
  {
    id: 'ko-tensa',
    match: ['p', 't', 'k', 's'],
    with: ['fortis'],
    out: (c) => c.phone.base + c.phone.base,
    special: true,
  },
  {
    id: 'ko-aspirada',
    match: '@consonant',
    with: ['aspirated'],
    out: (c) => c.plain(c.phone.base),
    special: true,
  },
];

export const PROFILES: Partial<Record<Lang, Profile>> = {
  'en-US': { lang: 'en-US', rules: [EN_US_NO_FLAP, EN_US_FLAP, EN_R] },
  'en-GB': { lang: 'en-GB', rules: [EN_R] },
  'es-ES': { lang: 'es-ES', rules: ES_RULES },
  'es-419': { lang: 'es-419', rules: ES_RULES },
  'it-IT': { lang: 'it-IT', rules: IT_RULES },
  'ja-JP': { lang: 'ja-JP', rules: JA_RULES },
  'ko-KR': { lang: 'ko-KR', rules: KO_RULES },
};
