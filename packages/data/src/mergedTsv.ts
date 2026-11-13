/**
 * Formato do resultado do merge (T2.6), lido pelo gerador de shards (T2.7).
 *
 *   #falagringo-merged v1
 *   #lang en-US
 *   word<TAB>ipa<TAB>rank<TAB>source<TAB>stress<TAB>kind<TAB>agree
 *   water<TAB>ˈwɔtɚ<TAB>0<TAB>cmudict<TAB>marked<TAB>common<TAB>
 *
 * `agree` = fontes concordantes separadas por vírgula (vazio se nenhuma). Um arquivo por idioma:
 * build/merged/{lang}.tsv
 */
import type { MergedEntry, StressStatus } from './merge';
import { isLang, type Lang } from './schema';
import { isSourceId, type SourceId } from './sources';

export const MERGED_HEADER = '#falagringo-merged v1';
const COLUMNS = ['word', 'ipa', 'rank', 'source', 'stress', 'kind', 'agree'] as const;
const STRESS: readonly StressStatus[] = ['marked', 'borrowed', 'mono', 'none'];

export function serializeMerged(lang: Lang, entries: readonly MergedEntry[]): string {
  const lines = [MERGED_HEADER, `#lang ${lang}`, COLUMNS.join('\t')];
  for (const e of entries) {
    if (e.lang !== lang) throw new Error(`Entrada "${e.word}" é de ${e.lang}, mas o arquivo é ${lang}`);
    lines.push([e.word, e.ipa, e.rank, e.source, e.stress, e.kind, e.agree.join(',')].join('\t'));
  }
  return lines.join('\n') + '\n';
}

export function parseMerged(text: string): { lang: Lang; entries: MergedEntry[] } {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== MERGED_HEADER) throw new Error(`Cabeçalho inválido: esperado "${MERGED_HEADER}"`);
  const lang = lines[1]?.startsWith('#lang ') ? lines[1].slice(6).trim() : '';
  if (!isLang(lang)) throw new Error(`Idioma inválido no cabeçalho: ${lang}`);
  if (lines[2] !== COLUMNS.join('\t')) throw new Error('Linha de colunas inválida');

  const entries: MergedEntry[] = [];
  lines.slice(3).forEach((line, i) => {
    if (!line) return;
    const [word, ipa, rank, source, stress, kind, agree] = line.split('\t');
    const agreeList = agree ? agree.split(',') : [];
    const bad =
      !word ||
      !ipa ||
      !/^\d+$/.test(rank) ||
      !isSourceId(source) ||
      !STRESS.includes(stress as StressStatus) ||
      (kind !== 'common' && kind !== 'proper') ||
      !agreeList.every(isSourceId);
    if (bad) throw new Error(`Linha ${i + 4} inválida: ${line}`);
    entries.push({
      word,
      ipa,
      lang,
      rank: Number(rank),
      source: source as SourceId,
      stress: stress as StressStatus,
      kind,
      agree: agreeList as SourceId[],
    });
  });
  return { lang, entries };
}
