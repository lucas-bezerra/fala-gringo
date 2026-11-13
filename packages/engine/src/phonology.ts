/**
 * Fonologia (T3.5): IPA → pronúncia PT-BR. Encadeia parser (T3.3) → silabação e tônica (T3.4) → regras (T3.5)
 * → maiúsculas da tônica (R11). Substitui a `placeholderPhonology`.
 */
import { parseIpa } from './ipa/parse';
import { syllabify } from './ipa/syllabify';
import { applyRules } from './rules/apply';
import type { Phonology } from './stages';
import type { Lang, Pronunciation, Syllable, TrapId } from './types';

/** Detalhe de diagnóstico: bases sem regra (para o relatório de cobertura). */
export interface RenderDiagnostics {
  unmapped: string[];
}

export function renderPronunciation(
  ipa: string,
  lang: Lang,
  stress: Parameters<Phonology['render']>[2],
  word?: string,
  diagnostics?: RenderDiagnostics,
): Pronunciation {
  const result = syllabify(parseIpa(ipa, lang), lang, { word, stress });
  const syllables: Syllable[] = [];
  const traps: TrapId[] = [];
  result.words.forEach((w, wi) => {
    const ruled = applyRules(w, lang);
    diagnostics?.unmapped.push(...ruled.unmapped);
    for (const t of ruled.traps) if (!traps.includes(t)) traps.push(t);
    ruled.syllables.forEach((s, si) => {
      const raw = s.segments.map((seg) => seg.text).join('');
      const stressed = s.stress === 1; // só a primária vai em maiúsculas (notação 3.1)
      const syl: Syllable = {
        text: stressed ? raw.toLocaleUpperCase('pt-BR') : raw,
        stressed,
        segments: s.segments.map(({ text, ipa: segIpa, special, rule }) => ({
          text,
          ipa: segIpa,
          special,
          rule,
        })),
      };
      if (wi > 0 && si === 0) syl.wordStart = true;
      syllables.push(syl);
    });
  });
  return { ipa, syllables, traps, stress: result.stress };
}

export function createPhonology(): Phonology {
  return { render: (ipa, lang, stress, word) => renderPronunciation(ipa, lang, stress, word) };
}
