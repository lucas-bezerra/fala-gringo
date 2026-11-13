/**
 * Importador do open-dict-data/ipa-dict (T2.2).
 * Formato de origem: `palavra<TAB>/ipa1/, /ipa2/` — uma palavra por linha.
 */
import type { Entry, Lang } from '../schema';

/** Arquivos de raw/ipa-dict → idioma. Só os permitidos pelo SOURCES.md. */
export const IPA_DICT_FILES: Record<string, Lang> = {
  en_US: 'en-US',
  de: 'de-DE',
  ja: 'ja-JP',
  ko: 'ko-KR',
  nl: 'nl-NL',
  sv: 'sv-SE',
};

export interface ImportStats {
  lines: number;
  entries: number;
  skipped: number;
}

export function importIpaDict(text: string, lang: Lang): { entries: Entry[]; stats: ImportStats } {
  const entries: Entry[] = [];
  const stats: ImportStats = { lines: 0, entries: 0, skipped: 0 };

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    stats.lines++;
    const tab = rawLine.indexOf('\t');
    if (tab < 0) {
      stats.skipped++;
      continue;
    }
    const word = rawLine.slice(0, tab).trim().normalize('NFC');
    const variants = rawLine
      .slice(tab + 1)
      .split(',')
      .map((v) => cleanIpa(v))
      .filter(Boolean);
    if (!word || variants.length === 0) {
      stats.skipped++;
      continue;
    }
    // Remove variantes repetidas (a mesma pronúncia listada duas vezes), preservando a ordem.
    [...new Set(variants)].forEach((ipa, rank) =>
      entries.push({ word, ipa, lang, source: 'ipa-dict', rank }),
    );
  }
  stats.entries = entries.length;
  return { entries, stats };
}

function cleanIpa(raw: string): string {
  return raw
    .trim()
    .replace(/^[/[]|[/\]]$/g, '')
    .replace(/-/g, ' ') // ko.txt: o hífen repete o hífen da palavra composta → separador de palavra
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
}
