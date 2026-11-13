/**
 * Importador do WikiPron (T2.4) — dados do Wiktionary, CC BY-SA 4.0.
 *
 * Formato de origem: `palavra<TAB>s e g m e n t o s` (IPA segmentado por espaços), uma pronúncia por linha;
 * a mesma palavra pode aparecer em várias linhas (variantes).
 * ATENÇÃO: os TSV publicados NÃO têm marcas de tônica nem de sílaba (ver `SOURCES.wikipron.stress`).
 */
import type { Entry, Lang } from '../schema';

/** Arquivos de raw/wikipron → idioma. Versão "broad" (fonêmica) e "filtered" (só fones do inventário). */
export const WIKIPRON_FILES: Record<string, Lang> = {
  spa_latn_ca_broad_filtered: 'es-ES',
  spa_latn_la_broad_filtered: 'es-419',
  fra_latn_broad_filtered: 'fr-FR',
  ita_latn_broad_filtered: 'it-IT',
  deu_latn_broad_filtered: 'de-DE',
  eng_latn_uk_broad_filtered: 'en-GB',
};

export interface WikipronStats {
  lines: number;
  entries: number;
  skipped: number;
  duplicates: number;
}

export function importWikipron(text: string, lang: Lang): { entries: Entry[]; stats: WikipronStats } {
  const entries: Entry[] = [];
  const stats: WikipronStats = { lines: 0, entries: 0, skipped: 0, duplicates: 0 };
  const rankByWord = new Map<string, number>();
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    stats.lines++;
    const [rawWord, segments, ...rest] = rawLine.split('\t');
    const word = rawWord?.trim().normalize('NFC');
    // Os segmentos são unidos sem espaço: a segmentação fonética é refeita pelo motor (T3.3).
    const ipa = segments?.trim().split(/\s+/).join('').normalize('NFC');
    if (!word || !ipa || rest.length > 0) {
      stats.skipped++;
      continue;
    }

    const key = `${word}\t${ipa}`;
    if (seen.has(key)) {
      stats.duplicates++;
      continue;
    }
    seen.add(key);

    const rank = rankByWord.get(word) ?? 0;
    rankByWord.set(word, rank + 1);
    entries.push({ word, ipa, lang, source: 'wikipron', rank });
  }

  stats.entries = entries.length;
  return { entries, stats };
}
