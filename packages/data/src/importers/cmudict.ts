/**
 * Importador do CMUdict (T2.3) com conversão ARPAbet → IPA (inglês americano geral).
 *
 * Formato de origem: `palavra FONEMAS [# comentário]`, variantes como `palavra(2)`.
 * A conversão é fiel à fonte: não aplica processos fonéticos (ex.: o flap de "water" fica /t/).
 * Esses processos são do perfil EN-US do motor (T3.7), não dos dados.
 */
import type { Entry } from '../schema';

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

/**
 * Ataques silábicos permitidos no inglês americano, usados para posicionar ˈ/ˌ no início da sílaba
 * (princípio do ataque máximo). Qualquer consoante isolada exceto NG também é ataque válido.
 */
const LEGAL_CLUSTERS = new Set([
  'P R', 'P L', 'P Y', 'B R', 'B L', 'B Y', 'T R', 'T W', 'D R', 'D W',
  'K R', 'K L', 'K W', 'K Y', 'G R', 'G L', 'G W', 'F R', 'F L', 'F Y',
  'TH R', 'TH W', 'SH R', 'V Y', 'M Y', 'HH Y',
  'S L', 'S W', 'S P', 'S T', 'S K', 'S M', 'S N', 'S F',
  'S P R', 'S P L', 'S P Y', 'S T R', 'S K R', 'S K W', 'S K L', 'S K Y',
]); // prettier-ignore

function isLegalOnset(cluster: string[]): boolean {
  if (cluster.length === 0) return true;
  if (cluster.length === 1) return cluster[0] !== 'NG';
  return LEGAL_CLUSTERS.has(cluster.join(' '));
}

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

  // Índice do fonema antes do qual vai cada marca de tônica.
  const marks = new Map<number, string>();
  let prevVowel = -1;
  phones.forEach((p, i) => {
    if (p.stress === null) return;
    if (p.stress > 0) {
      const consonants = phones.slice(prevVowel + 1, i).map((c) => c.base);
      let onsetStart = i;
      if (prevVowel < 0) {
        onsetStart = 0; // primeira sílaba: todas as consoantes iniciais são ataque
      } else {
        for (let k = 0; k <= consonants.length; k++) {
          if (isLegalOnset(consonants.slice(k))) {
            onsetStart = prevVowel + 1 + k;
            break;
          }
        }
      }
      marks.set(onsetStart, p.stress === 1 ? 'ˈ' : 'ˌ');
    }
    prevVowel = i;
  });

  return phones
    .map((p, i) => {
      const sound =
        p.stress === null
          ? CONSONANTS[p.base]
          : p.stress > 0
            ? VOWELS[p.base].stressed
            : VOWELS[p.base].unstressed;
      return (marks.get(i) ?? '') + sound;
    })
    .join('');
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
