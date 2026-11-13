/**
 * Tabelas de símbolos do parser de IPA (T3.3). Montadas a partir do inventário REAL dos dados mesclados
 * (~120 símbolos distintos; ver INVENTORY.md), não só do alfabeto IPA de referência.
 */
import type { Lang } from '../types';

/** Vogais (formas-base, sem diacríticos). Inclui ᵻ/ᵿ ("ɪ ou ə", "ʊ ou ə"), usadas pelo Wiktionary. */
export const VOWELS = new Set([...'aeiouyæøœɐɑɒɔəɘɛɜɞɤɨɪɯɵɶʉʊʌʏɚɝᵻᵿ']);

/** Diacríticos combinantes → traço. Os de tom vão em `tone`, não aqui. */
export const COMBINING_FEATURES: Record<string, string> = {
  '̃': 'nasal',
  '̥': 'voiceless',
  '̊': 'voiceless',
  '̬': 'voiced',
  '̩': 'syllabic',
  '̍': 'syllabic',
  '̯': 'nonSyllabic',
  '̑': 'nonSyllabic',
  '͈': 'fortis', // consoante tensa do coreano (k͈)
  '̤': 'breathy',
  '̰': 'creaky',
  '̚': 'unreleased', // k̚
  '̪': 'dental',
  '̺': 'apical',
  '̻': 'laminal',
  '̹': 'moreRounded',
  '̜': 'lessRounded',
  '̟': 'advanced',
  '̠': 'retracted',
  '̈': 'centralized',
  '̽': 'midCentralized',
  '̝': 'raised',
  '̞': 'lowered',
  '̘': 'advancedTongueRoot',
  '̙': 'retractedTongueRoot',
  '̆': 'extraShort',
};

/** Diacríticos combinantes de tom (sobre a vogal). */
export const COMBINING_TONES: Record<string, string> = {
  '̋': 'extraHigh',
  '́': 'high',
  '̄': 'mid',
  '̀': 'low',
  '̏': 'extraLow',
  '̂': 'falling',
  '̌': 'rising',
};

/** Ligaduras de africada/coarticulação: a de baixo é normalizada para a de cima. */
export const TIE = '͡';
export const TIES = new Set(['͡', '͜']);

/** Letras modificadoras que se prendem ao som anterior. */
export const MODIFIER_FEATURES: Record<string, string> = {
  ʰ: 'aspirated',
  ʱ: 'breathyAspirated',
  ʲ: 'palatalized',
  ʷ: 'labialized',
  ˠ: 'velarized',
  ˤ: 'pharyngealized',
  ⁿ: 'nasalRelease',
  ˡ: 'lateralRelease',
  ᵝ: 'compressed', // japonês: ɯᵝ, ɰᵝ
  '˞': 'rhotic',
  ʼ: 'ejective',
  ˀ: 'glottalized',
  ʶ: 'uvularized',
  ᵊ: 'schwaRelease', // schwa opcional/fraco
  ː: 'long',
  ˑ: 'halfLong',
};

/** Letras de tom (barras) e números sobrescritos (acento 2 do sueco, tons numerados). */
export const TONE_LETTERS = new Set([...'˥˦˧˨˩']);
export const TONE_DIGITS = new Set([...'⁰¹²³⁴⁵']);

/** Marcas de prosódia. `ǀ` só conta como pausa entre espaços (senão é o clique dental). */
export const PROSODY = new Set(['|', '‖', '↗', '↘']);

/** Letras-ligadura antigas → forma canônica com ligadura. */
export const LIGATURE_LETTERS: Record<string, string> = {
  ʦ: 't͡s',
  ʣ: 'd͡z',
  ʧ: 't͡ʃ',
  ʤ: 'd͡ʒ',
  ʨ: 't͡ɕ',
  ʥ: 'd͡ʑ',
};

/**
 * Africadas escritas SEM ligadura que o idioma trata como um som só. No inglês "tʃ"/"dʒ" são africadas, mas
 * "ts" ("cats") é encontro — por isso a lista é por idioma (notação, seção 4.3: ts só é africada se a fonte diz).
 */
export const UNTIED_AFFRICATES: Partial<Record<Lang, ReadonlySet<string>>> = {
  'en-US': new Set(['tʃ', 'dʒ']),
  'en-GB': new Set(['tʃ', 'dʒ']),
  'ja-JP': new Set(['ts', 'dz', 'tɕ', 'dʑ']),
  'ko-KR': new Set(['tɕ', 'dʑ']),
  'it-IT': new Set(['tʃ', 'dʒ', 'ts', 'dz']),
  'de-DE': new Set(['ts', 'pf', 'tʃ', 'dʒ']),
  'es-ES': new Set(['tʃ']),
  'es-419': new Set(['tʃ']),
  'fr-FR': new Set(['tʃ', 'dʒ']),
  'nl-NL': new Set(['tʃ', 'dʒ']),
  'sv-SE': new Set(['tɕ']),
};

/**
 * Ditongos escritos SEM a marca de não silábico (`̯`). Com a marca, qualquer idioma agrupa (é explícito).
 * Japonês, coreano, espanhol, italiano e francês ficam de fora: as sequências de vogais são sílabas/moras
 * separadas ou as semivogais já vêm como j/w/ɥ.
 */
export const DIPHTHONGS: Partial<Record<Lang, ReadonlySet<string>>> = {
  'en-US': new Set(['aɪ', 'aʊ', 'eɪ', 'oʊ', 'ɔɪ']),
  'en-GB': new Set(['aɪ', 'aʊ', 'eɪ', 'əʊ', 'ɔɪ', 'ɪə', 'eə', 'ɛə', 'ʊə', 'oʊ']),
  'de-DE': new Set(['aɪ', 'aʊ', 'ɔʏ', 'ɔɪ']),
  'nl-NL': new Set(['ɛi', 'œy', 'ʌu', 'ɑu']),
};
