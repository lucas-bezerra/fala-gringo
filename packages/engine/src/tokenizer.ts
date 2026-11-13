/**
 * Tokenizador (T3.2). Base: `Intl.Segmenter` por palavra (ICU), com correções medidas nos casos difíceis:
 *
 * | Caso                         | ICU faz                       | Aqui                                              |
 * |------------------------------|-------------------------------|---------------------------------------------------|
 * | didn’t, John's, L’école      | uma palavra                   | `’` → `'` na busca; partes como alternativa       |
 * | well-known, Saint-Aubert     | separa no hífen               | junta (busca o composto) com as partes de reserva |
 * | 'bout, goin'                 | separa o apóstrofo da ponta   | gruda o apóstrofo (CMUdict tem "'bout")           |
 * | 1st, 1998, 3.14              | palavra                       | número (passa direto; ver LIMITAÇÕES)             |
 * | 北京烤鸭                       | segmenta por dicionário (bom) | —                                                 |
 * | ありがとうございます              | quebra "ございます" em ご·ざ·い·ます | LIMITAÇÃO: segmentação por dicionário fica na T5.5 |
 *
 * Também marca maiúscula e início de frase, usados pelo modo texto misto (engine.ts).
 */
import type { RawToken, Tokenizer, WordRaw } from './stages';
import type { Lang } from './types';

const APOSTROPHES = /[’‘ʼ´`]/gu;
const HYPHENS = /[‐‑]/gu;
const IS_APOSTROPHE = /^['’‘ʼ]$/u;
const IS_HYPHEN = /^[-‐‑]$/u;
const SENTENCE_END = /[.!?…¿¡。！？]/u;

/** Forma usada na busca: NFC, apóstrofos e hífens tipográficos unificados. O texto original é preservado. */
export function normalizeForLookup(text: string): string {
  return text.normalize('NFC').replace(APOSTROPHES, "'").replace(HYPHENS, '-');
}

const isCapitalized = (w: string) => {
  const first = [...w].find((c) => /\p{L}/u.test(c));
  return !!first && first !== first.toLocaleLowerCase();
};

function word(text: string, sentenceStart = false, parts?: RawToken[]): WordRaw {
  return {
    kind: 'word',
    text,
    norm: normalizeForLookup(text),
    capitalized: isCapitalized(text),
    sentenceStart,
    parts,
  };
}

/**
 * Partes de reserva para palavras com apóstrofo interno, usadas só se a palavra inteira não estiver no dicionário.
 * fr/it: elisão — "l'école" → l' + école; "d'aujourd'hui" → d' + aujourd'hui (corta só no primeiro).
 * en: contração/possessivo — "John's" → John + 's; "didn't" → did + n't.
 */
function apostropheParts(text: string, lang: Lang): RawToken[] | undefined {
  const norm = normalizeForLookup(text);
  if (!norm.includes("'")) return undefined;
  if (lang.startsWith('fr') || lang.startsWith('it')) {
    const m = /^(\p{L}{1,5}')(\p{L}.*)$/u.exec(norm);
    if (m) return [word(text.slice(0, m[1].length)), word(text.slice(m[1].length))];
  }
  if (lang.startsWith('en')) {
    const nt = /^(\p{L}+)(n't)$/iu.exec(norm);
    if (nt) return [word(text.slice(0, nt[1].length)), word(text.slice(nt[1].length))];
    const m = /^(\p{L}+)('(?:s|re|ve|ll|d|m|t))$/iu.exec(norm);
    if (m) return [word(text.slice(0, m[1].length)), word(text.slice(m[1].length))];
  }
  return undefined;
}

export function createTokenizer(): Tokenizer {
  return {
    tokenize(text: string, lang: Lang): RawToken[] {
      const segments = [...new Intl.Segmenter(lang, { granularity: 'word' }).segment(text)];

      // 1. Classificação básica.
      const base: RawToken[] = segments.map((s) => {
        if (s.isWordLike) {
          if (/\p{N}/u.test(s.segment)) return { kind: 'text', text: s.segment, reason: 'number' };
          return word(s.segment, false, apostropheParts(s.segment, lang));
        }
        return { kind: 'text', text: s.segment, reason: /^\s+$/u.test(s.segment) ? 'space' : 'punctuation' };
      });

      // 2. Junções: compostos com hífen e apóstrofos nas pontas.
      const out: RawToken[] = [];
      const compounds = new Set<RawToken>();
      for (let i = 0; i < base.length; i++) {
        const t = base[i];
        const prev = out[out.length - 1];
        const next = base[i + 1];

        // apóstrofo inicial grudado: (início | espaço) ' palavra → "'bout"
        if (
          t.kind === 'text' &&
          IS_APOSTROPHE.test(t.text) &&
          next?.kind === 'word' &&
          (!prev || (prev.kind === 'text' && prev.reason === 'space'))
        ) {
          out.push(
            word(t.text + next.text, false, [{ kind: 'text', text: t.text, reason: 'punctuation' }, next]),
          );
          i++;
          continue;
        }
        // apóstrofo final (só inglês): palavra ' (fim | espaço | pontuação) → "goin'"
        if (
          lang.startsWith('en') &&
          t.kind === 'text' &&
          IS_APOSTROPHE.test(t.text) &&
          prev?.kind === 'word' &&
          !prev.norm.includes("'") &&
          (!next || next.kind === 'text')
        ) {
          out[out.length - 1] = word(prev.text + t.text, false, [
            prev,
            { kind: 'text', text: t.text, reason: 'punctuation' },
          ]);
          continue;
        }
        // composto com hífen: palavra - palavra (- palavra …), sem espaços
        if (t.kind === 'text' && IS_HYPHEN.test(t.text) && prev?.kind === 'word' && next?.kind === 'word') {
          const head = compounds.has(prev) ? prev.parts! : [prev]; // estende um composto já montado
          const merged = word(prev.text + t.text + next.text, false, [
            ...head,
            { kind: 'text', text: t.text, reason: 'punctuation' },
            next,
          ]);
          compounds.add(merged);
          out[out.length - 1] = merged;
          i++;
          continue;
        }
        out.push(t);
      }

      // 3. Início de frase: primeira palavra do texto ou depois de . ! ? … (só espaços e aspas entre eles).
      let atStart = true;
      for (const t of out) {
        if (t.kind === 'word') {
          t.sentenceStart = atStart;
          atStart = false;
        } else if (t.reason === 'punctuation' && SENTENCE_END.test(t.text)) {
          atStart = true;
        } else if (t.reason === 'number') {
          atStart = false;
        }
      }
      return out;
    },
  };
}

/** Lê o léxico publicado (`manifest.lexicons['pt-BR']`) para o modo texto misto. */
export { parsePtLexicon } from '@falagringo/data/ptLexicon';
