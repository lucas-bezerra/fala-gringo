/**
 * Núcleo comum das regras IPA → PT-BR: docs/notacao.md, seção 4 (tabela) e seção 5 (R6–R9, R12).
 * ORDEM IMPORTA: a primeira regra que casa vence. Padrões com diacrítico (ɑ̃) antes do som simples (ɑ);
 * contextos (ŋ antes de k) antes da regra geral. O teste de sombreamento acusa regra inalcançável.
 * 🟧 = `special: true` (som que não existe no PT-BR de mídia, notação 5.1).
 */
import type { MapRule, OrthoRule, TrapRule } from './dsl';

/** Saída = a própria base ("p" → "p"). */
const same = ({ phone }: { phone: { base: string } }) => phone.base;

const STRONG_R = ['h', 'ɦ', 'x', 'χ', 'ħ'];
const STRONG_R_SPECIAL = ['ʁ', 'ʀ'];

export const CORE_RULES: readonly MapRule[] = [
  // ---- Traços que mudam a grafia de qualquer consoante ---------------------------------------------------------
  // consoante silábica (l̩, n̩): o leitor precisa de uma vogal — "little" → LI·râl
  {
    id: 'consoante-silábica',
    match: '@consonant',
    with: ['syllabic'],
    out: (c) => 'â' + c.plain(c.phone.base),
  },
  // palatalização (ʲ) → acrescenta i
  { id: 'palatalizada', match: '@consonant', with: ['palatalized'], out: (c) => c.plain(c.phone.base) + 'i' },

  // ---- Vogais nasais (antes das orais) -------------------------------------------------------------------------
  { id: 'ɑ̃', match: ['ɑ̃', 'ã', 'ɐ̃'], out: 'ã' },
  { id: 'ɔ̃', match: ['ɔ̃', 'õ'], out: 'õ' },
  { id: 'ɛ̃', match: ['ɛ̃', 'œ̃', 'ẽ'], out: 'ẽ' },
  {
    id: 'vogal-nasal',
    match: '@vowel',
    with: ['nasal'],
    except: '@diphthong',
    out: (c) => c.plain(c.phone.base),
  },

  // ---- Ditongos da tabela 4.1 (antes da composição genérica) ---------------------------------------------------
  { id: 'aɪ', match: 'aɪ', out: 'ai' },
  { id: 'aʊ', match: 'aʊ', out: 'au' },
  { id: 'eɪ', match: 'eɪ', out: 'êi' },
  { id: 'oʊ', match: ['oʊ', 'əʊ'], out: 'ôu' },
  { id: 'ɔɪ', match: ['ɔɪ', 'ɔʏ'], out: 'ói' },
  { id: 'ɪə', match: 'ɪə', out: 'iâ' },
  { id: 'eə', match: ['eə', 'ɛə'], out: 'éâ' },
  { id: 'ʊə', match: 'ʊə', out: 'uâ' },
  // outros ditongos (ɛɐ̯ alemão, ai japonês…): grafia de cada vogal, em sequência
  {
    id: 'ditongo-composto',
    match: '@diphthong',
    out: (c) => [...c.phone.base].map((v) => c.plain(v)).join(''),
  },

  // ---- Vogais (4.1) ---------------------------------------------------------------------------------------------
  { id: 'i', match: ['i', 'ɪ', 'ᵻ', 'ɨ'], out: 'i' },
  { id: 'y', match: ['y', 'ʏ'], out: 'ü', special: true },
  { id: 'u', match: ['u', 'ʊ', 'ᵿ', 'ʉ', 'ɯ'], out: 'u' },
  { id: 'e', match: 'e', out: 'ê' },
  { id: 'ɛ', match: ['ɛ', 'æ'], out: 'é' },
  { id: 'ø', match: 'ø', out: 'ê', special: true },
  { id: 'œ', match: ['œ', 'ɶ'], out: 'é', special: true },
  { id: 'ɜ', match: 'ɜ', out: 'â', special: true },
  { id: 'ə', match: ['ə', 'ɐ', 'ʌ', 'ɘ'], out: 'â' },
  { id: 'ɚ', match: ['ɚ', 'ɝ'], out: 'er', special: true },
  { id: 'o', match: ['o', 'ɵ', 'ɤ'], out: 'ô' },
  { id: 'ɔ', match: ['ɔ', 'ɒ', 'ɞ'], out: 'ó' },
  // R10 — antinasalização: "a" tônico antes de nasal na sílaba seguinte (o brasileiro nasaliza: "cama" [ˈkɐ̃mɐ])
  { id: 'a-antinasal', match: ['a', 'ɑ'], when: { stressed: true, nextOnset: '@nasal' }, out: 'á' },
  { id: 'a', match: ['a', 'ɑ'], out: 'a' },

  // ---- Semivogais (4.2, R9) ---------------------------------------------------------------------------------------
  { id: 'j-antes-de-i', match: 'j', when: { next: '@i' }, out: '' },
  { id: 'j', match: ['j', 'ʝ'], out: 'i' },
  { id: 'w-antes-de-u', match: ['w', 'ʍ'], when: { next: '@u' }, out: '' },
  { id: 'w', match: ['w', 'ʍ', 'ɰ'], out: 'u' },
  { id: 'ɥ', match: 'ɥ', out: 'ü', special: true },

  // ---- Consoantes (4.3) -------------------------------------------------------------------------------------------
  { id: 'iguais', match: ['p', 'b', 't', 'd', 'f', 'v', 'm', 'n', 'l', 'z'], out: same },
  { id: 'k', match: ['k', 'c', 'q'], out: 'k' },
  { id: 'g', match: ['ɡ', 'ɟ', 'ɣ'], out: 'g' },
  { id: 's', match: 's', out: 's' },
  { id: 'ʃ', match: ['ʃ', 'ɕ', 'ʂ'], out: 'ch' },
  { id: 'ʒ', match: ['ʒ', 'ʑ', 'ʐ'], out: 'j' },
  { id: 't͡ʃ', match: ['t͡ʃ', 't͡ɕ', 't͡ʂ'], out: 'tch' },
  { id: 'd͡ʒ', match: ['d͡ʒ', 'd͡ʑ', 'd͡ʐ'], out: 'dj' },
  { id: 't͡s', match: 't͡s', out: 'ts', special: true },
  { id: 'd͡z', match: 'd͡z', out: 'dz', special: true },
  { id: 'p͡f', match: 'p͡f', out: 'pf', special: true },
  { id: 'θ', match: 'θ', out: 'th', special: true },
  { id: 'ð', match: 'ð', out: 'dh', special: true },
  { id: 'ɹ', match: ['ɹ', 'ɻ'], out: 'r', special: true },
  { id: 'ɾ', match: ['ɾ', 'ɺ'], out: 'r' },
  // vibrante múltipla (espanhol/italiano): r no início da palavra, rr no resto — sempre destacada
  { id: 'r-inicial', match: 'r', when: { wordInitial: true }, out: 'r', special: true },
  { id: 'r', match: 'r', out: 'rr', special: true },
  // R7 — r forte: r no início da palavra; rr nas outras posições
  { id: 'r-forte-inicial', match: STRONG_R, when: { wordInitial: true }, out: 'r' },
  { id: 'r-forte', match: STRONG_R, out: 'rr' },
  { id: 'ʁ-inicial', match: STRONG_R_SPECIAL, when: { wordInitial: true }, out: 'r', special: true },
  { id: 'ʁ', match: STRONG_R_SPECIAL, out: 'rr', special: true },
  { id: 'ç', match: 'ç', out: 'ch', special: true },
  { id: 'ɧ', match: 'ɧ', out: 'ch', special: true },
  { id: 'ɸ', match: 'ɸ', out: 'f', special: true },
  { id: 'β', match: 'β', out: 'b' },
  { id: 'ŋ-velar', match: 'ŋ', when: { next: ['k', 'ɡ'] }, out: 'n' },
  { id: 'ŋ', match: 'ŋ', out: 'ng', special: true },
  { id: 'ɲ', match: 'ɲ', out: 'nh' },
  { id: 'ʎ', match: 'ʎ', out: 'lh' },
  { id: 'nasais-raras', match: ['ɴ', 'ɳ'], out: 'n' },
  { id: 'ɱ', match: 'ɱ', out: 'm' },
  { id: 'laterais-raras', match: ['ɭ', 'ɫ'], out: 'l' },
  { id: 'ɬ', match: 'ɬ', out: 'lh', special: true },
  { id: 'retroflexas', match: ['ʈ', 'ɖ'], out: (c) => (c.phone.base === 'ʈ' ? 't' : 'd') },
  { id: 'ʋ', match: 'ʋ', out: 'v' },
  { id: 'ɓ', match: 'ɓ', out: 'b' },
  { id: 'mudas', match: ['ʔ', 'ʕ'], out: '' },
];

/** R6 e R8: dependem das LETRAS geradas, atravessando sílabas (notação 5). */
export const CORE_ORTHOGRAPHY: readonly OrthoRule[] = [
  { id: 'R6-ss', target: 's', prev: 'vowel', next: 'vowel', out: 'ss' }, // mé·ssâ, ês·ta·SSIÔN
  { id: 'R8-gu', target: 'g', next: 'front', out: 'gu' }, // GUIV
];

/** Armadilhas de posição (notação 5.3). Todas as que casam valem. */
export const CORE_TRAPS: readonly TrapRule[] = [
  { trap: 'TI_DI', match: ['t', 'd'], when: { next: ['@i', 'j'] } },
  { trap: 'CODA_L', match: ['l', 'ɫ', 'ɭ'], when: { slot: 'coda' } },
  { trap: 'CODA_NASAL', match: ['m', 'n', 'ɴ', 'ɱ', 'ɳ'], when: { slot: 'coda' } },
  // consoante final: obstruintes, menos z (armadilha própria), r forte (escrito rr) e as mudas
  {
    trap: 'FINAL_CONS',
    match: '@obstruent',
    except: ['z', 'ʔ', 'ʕ', ...STRONG_R, ...STRONG_R_SPECIAL],
    when: { wordFinal: true },
  },
  { trap: 'S_CLUSTER', match: ['s', 'ʃ'], when: { wordInitial: true, next: '@consonant' } },
  { trap: 'FINAL_Z', match: 'z', when: { wordFinal: true } },
  { trap: 'INITIAL_TAP', match: 'ɾ', when: { wordInitial: true } },
  { trap: 'CODA_R', match: ['ɾ', 'r'], when: { slot: 'coda' } },
];
