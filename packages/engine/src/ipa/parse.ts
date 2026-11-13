/**
 * Parser de IPA (T3.3): transcrição → tokens (sons, tônica, sílaba, espaço, tom, ligação, pausa, outro).
 *
 * GARANTIA: `serializeIpa(parseIpa(x)) === x.normalize('NFC')` — nada se perde (testado em todos os dados).
 * Trabalha na forma decomposta (NFD): cada letra-base junta os diacríticos e modificadores que a seguem;
 * a ligadura junta a letra seguinte (africadas). Depois, por idioma, agrupa africadas e ditongos sem marca.
 */
import type { Lang } from '../types';
import {
  COMBINING_FEATURES,
  COMBINING_TONES,
  DIPHTHONGS,
  LIGATURE_LETTERS,
  MODIFIER_FEATURES,
  PROSODY,
  TIE,
  TIES,
  TONE_DIGITS,
  TONE_LETTERS,
  UNTIED_AFFRICATES,
  VOWELS,
} from './symbols';

export interface Phone {
  kind: 'phone';
  /** Trecho original (NFC), com todos os diacríticos e modificadores. */
  text: string;
  /**
   * Forma canônica para as regras: sem diacríticos de traço nem modificadores, ligadura padronizada (͡),
   * letras-ligadura expandidas (ʦ → t͡s), africadas/ditongos agrupados. Ex.: "t͡ʃ", "aɪ", "ç", "a" (de "ã").
   */
  base: string;
  vowel: boolean;
  /** Traços decodificados: nasal, voiceless, syllabic, nonSyllabic, aspirated, long, fortis… */
  features: string[];
  /** Tom marcado na própria vogal (ex.: "rising" em ə̌). */
  tone?: string;
  /** Diacríticos/modificadores sem traço conhecido (preservados no `text`). */
  unknownMarks?: string[];
}

export type IpaToken =
  | Phone
  | { kind: 'stress'; level: 1 | 2; text: string }
  | { kind: 'syllable'; text: string }
  | { kind: 'space'; text: string }
  | { kind: 'link'; text: string }
  | { kind: 'tone'; text: string }
  | { kind: 'prosody'; text: string }
  | { kind: 'other'; text: string };

const nfc = (s: string) => s.normalize('NFC');
const isLetter = (ch: string) => /\p{L}/u.test(ch);
const isMark = (ch: string) => /\p{M}/u.test(ch);
/** `ǀ` isolado (espaço ou borda dos dois lados) é barra de pausa; colado a um som é o clique dental. */
const isolated = (chars: string[], i: number) =>
  (i === 0 || /\s/u.test(chars[i - 1])) && (i === chars.length - 1 || /\s/u.test(chars[i + 1]));

interface Draft {
  chars: string[];
  /** Letras-base (sem marcas), na ordem — mais de uma em africadas/ditongos. */
  bases: string[];
  marks: string[];
}

function finish(d: Draft): Phone {
  const features: string[] = [];
  const unknown: string[] = [];
  let tone: string | undefined;
  for (const m of d.marks) {
    if (TIES.has(m)) continue;
    const f = COMBINING_FEATURES[m] ?? MODIFIER_FEATURES[m];
    if (f) {
      if (!features.includes(f)) features.push(f);
    } else if (COMBINING_TONES[m]) tone = COMBINING_TONES[m];
    else unknown.push(m);
  }
  // A cedilha faz parte da letra (ç), não é traço: volta para a base.
  const bases = d.bases.map((b, i) =>
    b === 'c' && d.chars[d.chars.indexOf('c') + 1] === '̧' && i === 0 ? 'ç' : b,
  );
  const expanded = bases.map((b) => LIGATURE_LETTERS[b] ?? b);
  const vowel = expanded.every((b) => VOWELS.has(b[0]));
  const base = nfc(vowel ? expanded.join('') : expanded.join(TIE));
  const phone: Phone = { kind: 'phone', text: nfc(d.chars.join('')), base, vowel, features };
  if (tone) phone.tone = tone;
  if (unknown.length) phone.unknownMarks = unknown;
  return phone;
}

export function parseIpa(ipa: string, lang?: Lang): IpaToken[] {
  const chars = [...ipa.normalize('NFD')];
  const out: (IpaToken | Draft)[] = [];
  let draft: Draft | undefined;
  let joinNext = false;
  const close = () => {
    if (draft) out.push(draft);
    draft = undefined;
  };
  const push = (t: IpaToken) => {
    close();
    joinNext = false;
    out.push(t);
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === 'ˈ' || ch === 'ˌ') push({ kind: 'stress', level: ch === 'ˈ' ? 1 : 2, text: ch });
    else if (ch === '.') push({ kind: 'syllable', text: ch });
    else if (/\s/u.test(ch)) push({ kind: 'space', text: ch });
    else if (ch === '‿' || ch === '⁀') push({ kind: 'link', text: ch });
    else if (PROSODY.has(ch) || (ch === 'ǀ' && isolated(chars, i))) push({ kind: 'prosody', text: ch });
    else if (TONE_LETTERS.has(ch) || TONE_DIGITS.has(ch)) {
      // sequência de letras/dígitos de tom vira um token só (˨˩˧, ²)
      let text = ch;
      while (i + 1 < chars.length && (TONE_LETTERS.has(chars[i + 1]) || TONE_DIGITS.has(chars[i + 1])))
        text += chars[++i];
      push({ kind: 'tone', text });
    } else if (isMark(ch) || /\p{Lm}/u.test(ch)) {
      // diacrítico combinante ou letra modificadora (ʰ, ː, ᵝ…): pertence ao som anterior
      if (!draft) {
        push({ kind: 'other', text: ch }); // diacrítico solto, sem som antes
        continue;
      }
      if (ch === '\u0327' && draft.bases[draft.bases.length - 1] === 'c') {
        // a cedilha faz parte da letra (ç = fricativa palatal), não é traço
        draft.chars.push(ch);
        draft.bases[draft.bases.length - 1] = 'ç';
        continue;
      }
      draft.chars.push(ch);
      draft.marks.push(ch);
      if (TIES.has(ch)) joinNext = true;
    } else if (isLetter(ch)) {
      if (joinNext && draft) {
        draft.chars.push(ch);
        draft.bases.push(ch);
        joinNext = false;
      } else {
        close();
        draft = { chars: [ch], bases: [ch], marks: [] };
      }
    } else {
      push({ kind: 'other', text: ch });
    }
  }
  close();

  const tokens = out.map((t) => ('chars' in t ? finish(t) : t));
  return lang ? groupByLanguage(tokens, lang) : tokens;
}

/** Junta dois sons adjacentes num só (africada sem ligadura ou ditongo). */
function merge(a: Phone, b: Phone, base: string): Phone {
  const features = [...new Set([...a.features, ...b.features])].filter((f) => f !== 'nonSyllabic');
  const merged: Phone = { kind: 'phone', text: a.text + b.text, base, vowel: a.vowel, features };
  const tone = a.tone ?? b.tone;
  if (tone) merged.tone = tone;
  const unknown = [...(a.unknownMarks ?? []), ...(b.unknownMarks ?? [])];
  if (unknown.length) merged.unknownMarks = unknown;
  return merged;
}

/** Agrupamentos que dependem do idioma: africadas sem ligadura e ditongos. */
function groupByLanguage(tokens: IpaToken[], lang: Lang): IpaToken[] {
  const affricates = UNTIED_AFFRICATES[lang];
  const diphthongs = DIPHTHONGS[lang];
  const out: IpaToken[] = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (t.kind === 'phone' && prev?.kind === 'phone') {
      // africada sem ligadura: t + ʃ → t͡ʃ (só se a 1ª não tiver traço que a separe, ex.: aspiração)
      const pair = prev.base + t.base;
      if (!prev.vowel && !t.vowel && affricates?.has(pair) && prev.features.length === 0) {
        out[out.length - 1] = merge(prev, t, nfc(prev.base + TIE + t.base));
        continue;
      }
      // ditongo: explícito (2ª vogal com ̯) em qualquer idioma; sem marca, só pela lista do idioma
      if (prev.vowel && t.vowel && !prev.base.includes(TIE)) {
        const explicit = t.features.includes('nonSyllabic') && !prev.features.includes('nonSyllabic');
        const listed =
          diphthongs?.has(pair) && !prev.features.includes('long') && !t.features.includes('syllabic');
        if ((explicit || listed) && [...prev.base].length === 1) {
          out[out.length - 1] = merge(prev, t, nfc(pair));
          continue;
        }
      }
    }
    out.push(t);
  }
  return out;
}

export function serializeIpa(tokens: readonly IpaToken[]): string {
  return nfc(tokens.map((t) => t.text).join(''));
}

/** Só os sons. */
export function phonesOf(tokens: readonly IpaToken[]): Phone[] {
  return tokens.filter((t): t is Phone => t.kind === 'phone');
}
