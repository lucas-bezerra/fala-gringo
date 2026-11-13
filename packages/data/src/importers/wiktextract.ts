/**
 * Extração de pronúncias COM TÔNICA do Wiktionary em inglês, via wiktextract/kaikki.org (T2.10).
 * Dados: CC BY-SA 4.0 (herdada do Wiktionary). Usado para it-IT e en-GB, que o WikiPron entrega sem tônica.
 *
 * Etapa 1 — `pickPronunciations()`: de cada objeto JSONL do kaikki, escolhe as transcrições fonêmicas
 *           (`/.../`) da variante pedida. O script grava o resultado compacto em raw/wiktextract/{lang}.tsv.
 * Etapa 2 — `importWiktextract()`: lê esse TSV compacto e gera entradas do formato intermediário.
 */
import type { Entry, Lang } from '../schema';

export interface KaikkiSound {
  ipa?: string;
  tags?: string[];
}
export interface KaikkiEntry {
  word?: string;
  lang_code?: string;
  sounds?: KaikkiSound[];
}

export interface Target {
  lang: Lang;
  /** `lang_code` do kaikki. */
  langCode: string;
  /** Aceita a transcrição? (ex.: só as britânicas para en-GB) */
  accept: (tags: readonly string[]) => boolean;
}

/**
 * en-GB: só a pronúncia britânica padrão — etiquetas exclusivamente `Received-Pronunciation` e/ou `UK`.
 * Ficam de fora variantes regionais (Northumbria, Wales…), qualificadas (obsolete, dated, rare, dialectal)
 * e a "British Southern Standard" moderna (/fɹɪj/), que usa outra convenção de transcrição.
 * Contagem no kaikki de 2026-10-30: RP só 39.844; UK só 21.096; RP+UK 665 — o resto, ~4 mil, fica fora.
 */
const STANDARD_UK_TAGS = new Set(['Received-Pronunciation', 'UK']);

export const TARGETS: Record<'it-IT' | 'en-GB', Target> = {
  'it-IT': { lang: 'it-IT', langCode: 'it', accept: () => true },
  'en-GB': {
    lang: 'en-GB',
    langCode: 'en',
    accept: (tags) => tags.length > 0 && tags.every((t) => STANDARD_UK_TAGS.has(t)),
  },
};

/** Remove `/ /`, segmentos opcionais `( )` e normaliza. Devolve `null` se não for fonêmica (`[ ]`) ou for fragmento. */
export function cleanKaikkiIpa(raw: string): string | null {
  const s = raw.trim();
  if (!s.startsWith('/') || !s.endsWith('/')) return null; // [ ] = transcrição fonética estreita
  const inner = s.slice(1, -1).trim();
  // Fragmentos (/-di/, terminação alternativa) e alternativas compactadas com ~ não são pronúncias completas.
  if (/^[-‿…]|[-‿…]$/.test(inner) || inner.includes('~')) return null;
  const ipa = s
    .slice(1, -1)
    .replace(/\([^)]*\)/g, '') // segmento opcional, ex.: /ˈwɔː.tə(ɹ)/ → forma sem ele
    .replace(/[₍₎]/g, '') // tônica secundária opcional: /₍ˌ₎daɪˈæn/ → /ˌdaɪˈæn/
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
  return ipa || null;
}

/** Etapa 1: pares (palavra, IPA) aceitos para o alvo. */
export function pickPronunciations(entry: KaikkiEntry, target: Target): { word: string; ipa: string }[] {
  const word = entry.word?.trim().normalize('NFC');
  if (!word || entry.lang_code !== target.langCode) return [];
  if (word.startsWith('-') || word.endsWith('-')) return []; // afixos (ex.: "-ità")
  const out: { word: string; ipa: string }[] = [];
  for (const s of entry.sounds ?? []) {
    if (!s.ipa || !target.accept(s.tags ?? [])) continue;
    for (const variant of s.ipa.split(/,\s*/)) {
      const ipa = cleanKaikkiIpa(variant);
      if (ipa) out.push({ word, ipa });
    }
  }
  return out;
}

/** Etapa 2: TSV compacto (`palavra<TAB>ipa`, na ordem de aparição) → entradas. */
export function importWiktextract(text: string, lang: Lang): Entry[] {
  const entries: Entry[] = [];
  const rankByWord = new Map<string, number>();
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const [word, ipa] = line.split('\t');
    if (!word || !ipa) continue;
    const key = `${word}\t${ipa}`;
    if (seen.has(key)) continue; // a mesma pronúncia repete em cada classe gramatical
    seen.add(key);
    const rank = rankByWord.get(word) ?? 0;
    rankByWord.set(word, rank + 1);
    entries.push({ word, ipa, lang, source: 'wiktextract', rank });
  }
  return entries;
}
