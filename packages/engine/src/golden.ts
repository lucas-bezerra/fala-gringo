/**
 * Golden sets por idioma (T3.8): gabaritos revisados por humano e a métrica de acerto do motor.
 *
 *   #falagringo-golden v1
 *   #lang en-US
 *   palavra<TAB>ipa<TAB>esperado<TAB>situação<TAB>observação
 *   water<TAB>ˈwɔtɚ<TAB>UÓ·rer<TAB>revisado<TAB>
 *
 * `esperado` = forma silabada. Só as linhas `revisado` contam; `rascunho` = saída do motor esperando revisão.
 * O IPA vai no arquivo: a medição não depende dos dados brutos (roda no CI).
 */
import { renderPronunciation } from './phonology';
import type { Lang } from './types';

export const GOLDEN_HEADER = '#falagringo-golden v1';
const COLUMNS = ['palavra', 'ipa', 'esperado', 'situação', 'observação'];
export type GoldenStatus = 'revisado' | 'rascunho';

export interface GoldenRow {
  word: string;
  ipa: string;
  expected: string;
  status: GoldenStatus;
  note: string;
}

export function parseGolden(text: string): { lang: Lang; rows: GoldenRow[] } {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== GOLDEN_HEADER) throw new Error(`Cabeçalho inválido: esperado "${GOLDEN_HEADER}"`);
  const lang = lines[1]?.replace(/^#lang /, '').trim() as Lang;
  if (lines[2] !== COLUMNS.join('\t')) throw new Error('Linha de colunas inválida');
  const rows: GoldenRow[] = [];
  lines.slice(3).forEach((line, i) => {
    if (!line.trim()) return;
    const [word, ipa, expected, status, note = ''] = line.split('\t');
    if (!word || !ipa || !expected || (status !== 'revisado' && status !== 'rascunho')) {
      throw new Error(`Linha ${i + 4} inválida (a situação deve ser "revisado" ou "rascunho"): ${line}`);
    }
    rows.push({ word, ipa, expected, status, note });
  });
  return { lang, rows };
}

export function serializeGolden(lang: Lang, rows: readonly GoldenRow[]): string {
  const body = rows.map((r) => [r.word, r.ipa, r.expected, r.status, r.note].join('\t'));
  return [GOLDEN_HEADER, `#lang ${lang}`, COLUMNS.join('\t'), ...body].join('\n') + '\n';
}

/** Saída do motor na forma silabada (a mesma que vai no gabarito). A tônica vem das marcas do IPA ou da regra. */
export function engineSyllabic(ipa: string, lang: Lang, word: string): string {
  const stress = /[ˈˌ]/.test(ipa) ? 'dictionary' : 'none';
  const p = renderPronunciation(ipa, lang, stress, word);
  return p.syllables.map((s, i) => (i === 0 ? '' : s.wordStart ? ' ' : '·') + s.text).join('');
}

export interface GoldenScore {
  lang: Lang;
  reviewed: number;
  correct: number;
  drafts: number;
  /** Erros nas linhas revisadas: palavra, esperado, obtido. */
  misses: { word: string; expected: string; got: string }[];
}

export function scoreGolden(lang: Lang, rows: readonly GoldenRow[]): GoldenScore {
  const score: GoldenScore = { lang, reviewed: 0, correct: 0, drafts: 0, misses: [] };
  for (const r of rows) {
    if (r.status === 'rascunho') {
      score.drafts++;
      continue;
    }
    score.reviewed++;
    const got = engineSyllabic(r.ipa, lang, r.word);
    if (got === r.expected) score.correct++;
    else score.misses.push({ word: r.word, expected: r.expected, got });
  }
  return score;
}
