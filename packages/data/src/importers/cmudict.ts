/**
 * Importador do CMUdict (T2.3) com conversão ARPAbet → IPA (inglês americano geral).
 *
 * Formato de origem: `palavra FONEMAS [# comentário]`, variantes como `palavra(2)`.
 * A conversão é fiel à fonte: não aplica processos fonéticos (ex.: o flap de "water" fica /t/).
 * Esses processos são do perfil EN-US do motor (T3.7), não dos dados.
 */
import type { Entry } from '../schema';
import { joinWithStress } from './englishStress';

const VOWELS: Record<string, { stressed: string; unstressed: string }> = {
  AA: { stressed: 'ɑ', unstressed: 'ɑ' },
  AE: { stressed: 'æ', unstressed: 'æ' },
  AH: { stressed: 'ʌ', unstressed: 'ə' },
  AO: { stressed: 'ɔ', unstressed: 'ɔ' },
  AW: { stressed: 'aʊ', unstressed: 'aʊ' },
  AY: { stressed: 'aɪ', unstressed: 'aɪ' },
  EH: { stressed: 'ɛ', unstressed: 'ɛ' },
  ER: { stressed: 'ɝ', unstressed: 'ɚ' },
  EY: { stressed: 'eɪ', unstressed: 'eɪ' },
  IH: { stressed: 'ɪ', unstressed: 'ɪ' },
  IY: { stressed: 'i', unstressed: 'i' },
  OW: { stressed: 'oʊ', unstressed: 'oʊ' },
  OY: { stressed: 'ɔɪ', unstressed: 'ɔɪ' },
  UH: { stressed: 'ʊ', unstressed: 'ʊ' },
  UW: { stressed: 'u', unstressed: 'u' },
};

const CONSONANTS: Record<string, string> = {
  B: 'b',
  CH: 'tʃ',
  D: 'd',
  DH: 'ð',
  F: 'f',
  G: 'ɡ',
  HH: 'h',
  JH: 'dʒ',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  NG: 'ŋ',
  P: 'p',
  R: 'ɹ',
  S: 's',
  SH: 'ʃ',
  T: 't',
  TH: 'θ',
  V: 'v',
  W: 'w',
  Y: 'j',
  Z: 'z',
  ZH: 'ʒ',
};

interface Phone {
  base: string;
  stress: 0 | 1 | 2 | null; // null = consoante
}

function parsePhone(token: string): Phone {
  const m = /^([A-Z]+)([012])?$/.exec(token);
  if (!m) throw new Error(`Fonema ARPAbet inválido: ${token}`);
  const [, base, digit] = m;
  if (base in VOWELS) {
    if (digit === undefined) throw new Error(`Vogal sem marca de tônica: ${token}`);
    return { base, stress: Number(digit) as 0 | 1 | 2 };
  }
  if (base in CONSONANTS && digit === undefined) return { base, stress: null };
  throw new Error(`Fonema ARPAbet desconhecido: ${token}`);
}

/** Converte uma sequência ARPAbet (ex.: "W AO1 T ER0") em IPA (ex.: "ˈwɔtɚ"). */
export function arpabetToIpa(arpabet: string): string {
  const phones = arpabet.trim().split(/\s+/).map(parsePhone);

  return joinWithStress(
    phones.map((p) => ({
      ipa:
        p.stress === null
          ? CONSONANTS[p.base]
          : p.stress > 0
            ? VOWELS[p.base].stressed
            : VOWELS[p.base].unstressed,
      stress: p.stress,
    })),
  );
}

export interface CmudictStats {
  lines: number;
  entries: number;
  skipped: number;
  failures: { line: number; text: string; error: string }[];
}

export function importCmudict(text: string): { entries: Entry[]; stats: CmudictStats } {
  const entries: Entry[] = [];
  const stats: CmudictStats = { lines: 0, entries: 0, skipped: 0, failures: [] };
  const rankByWord = new Map<string, number>();
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((rawLine, idx) => {
    const line = rawLine.replace(/\s+#.*$/, '').trim();
    if (!line || line.startsWith(';;;')) return;
    stats.lines++;

    const space = line.indexOf(' ');
    if (space < 0) {
      stats.skipped++;
      return;
    }
    const word = line
      .slice(0, space)
      .replace(/\(\d+\)$/, '')
      .normalize('NFC');
    let ipa: string;
    try {
      ipa = arpabetToIpa(line.slice(space + 1));
    } catch (error) {
      stats.skipped++;
      stats.failures.push({ line: idx + 1, text: rawLine, error: (error as Error).message });
      return;
    }

    const key = `${word}\t${ipa}`;
    if (seen.has(key)) return; // variante repetida após a conversão
    seen.add(key);

    const rank = rankByWord.get(word) ?? 0;
    rankByWord.set(word, rank + 1);
    entries.push({ word, ipa, lang: 'en-US', source: 'cmudict', rank });
  });

  stats.entries = entries.length;
  return { entries, stats };
}
