/**
 * Importador do Britfone (T2.10) — inglês britânico (RP/SSB), MIT.
 * Formato: `PALAVRA(n), s e g ˈm e n t o s` — tônica grudada na vogal, como no CMUdict.
 */
import type { Entry } from '../schema';
import { joinWithStress, type Segment } from './englishStress';

const VOWELS = new Set([
  'aɪ', 'aʊ', 'eɪ', 'i', 'iː', 'uː', 'æ', 'ɐ', 'ɑː', 'ɒ', 'ɔɪ', 'ɔː',
  'ə', 'əʊ', 'ɛ', 'ɛə', 'ɜː', 'ɪ', 'ɪə', 'ʊ', 'ʊə',
]); // prettier-ignore

const CONSONANTS = new Set([
  'b', 'd', 'dʒ', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 's', 't', 'tʃ',
  'v', 'w', 'z', 'ð', 'ŋ', 'ɹ', 'ʃ', 'ʒ', 'θ',
]); // prettier-ignore

function parseSegment(token: string): Segment {
  const mark = token[0];
  if (mark === 'ˈ' || mark === 'ˌ') {
    const vowel = token.slice(1);
    if (!VOWELS.has(vowel)) throw new Error(`Tônica em segmento que não é vogal: ${token}`);
    return { ipa: vowel, stress: mark === 'ˈ' ? 1 : 2 };
  }
  if (VOWELS.has(token)) return { ipa: token, stress: 0 };
  if (CONSONANTS.has(token)) return { ipa: token === 'g' ? 'ɡ' : token, stress: null };
  throw new Error(`Segmento desconhecido: ${token}`);
}

export function britfoneToIpa(segments: string): string {
  return joinWithStress(segments.trim().split(/\s+/).map(parseSegment));
}

export interface BritfoneStats {
  lines: number;
  entries: number;
  failures: { line: number; text: string; error: string }[];
}

export function importBritfone(text: string): { entries: Entry[]; stats: BritfoneStats } {
  const entries: Entry[] = [];
  const stats: BritfoneStats = { lines: 0, entries: 0, failures: [] };
  const rankByWord = new Map<string, number>();
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((rawLine, idx) => {
    if (!rawLine.trim()) return;
    stats.lines++;
    const comma = rawLine.indexOf(', ');
    try {
      if (comma < 0) throw new Error('linha sem ", "');
      const word = rawLine
        .slice(0, comma)
        .replace(/\(\d+\)$/, '')
        .trim()
        .toLowerCase()
        .normalize('NFC');
      const ipa = britfoneToIpa(rawLine.slice(comma + 2));
      const key = `${word}\t${ipa}`;
      if (seen.has(key)) return;
      seen.add(key);
      const rank = rankByWord.get(word) ?? 0;
      rankByWord.set(word, rank + 1);
      entries.push({ word, ipa, lang: 'en-GB', source: 'britfone', rank });
    } catch (error) {
      stats.failures.push({ line: idx + 1, text: rawLine, error: (error as Error).message });
    }
  });

  stats.entries = entries.length;
  return { entries, stats };
}
