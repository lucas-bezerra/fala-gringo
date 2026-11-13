/**
 * Importador de nomes próprios do Wikidata (T2.5) — propriedade P898 (transcrição IPA), CC0.
 * Lê o retrato raw/wikidata/p898.tsv gerado por scripts/fetch-wikidata.ts:
 *   qid<TAB>code<TAB>label<TAB>ipa<TAB>human<TAB>place<TAB>club
 * Só entram pessoas, lugares (com coordenadas) e clubes/times.
 */
import type { Entry, Lang } from '../schema';

/**
 * Código Wikimedia do idioma da pronúncia → idiomas do FalaGringo.
 * `es` sem região: se o IPA tem /θ/, só pode ser es-ES; sem /θ/, vale para as duas variantes.
 * `en` sem região: EN-US é a variante padrão do projeto (decisão Q1 da notação).
 */
function langsFor(code: string, ipa: string): Lang[] {
  switch (code) {
    case 'en':
    case 'en-us':
      return ['en-US'];
    case 'en-gb':
      return ['en-GB'];
    case 'es':
      return ipa.includes('θ') ? ['es-ES'] : ['es-ES', 'es-419'];
    case 'fr':
      return ['fr-FR'];
    case 'de':
      return ['de-DE'];
    case 'it':
      return ['it-IT'];
    case 'ja':
      return ['ja-JP'];
    case 'ko':
      return ['ko-KR'];
    case 'zh':
      return ['zh-CN'];
    case 'nl':
      return ['nl-NL'];
    case 'sv':
      return ['sv-SE'];
    default:
      return [];
  }
}

export interface WikidataStats {
  rows: number;
  entries: number;
  /** Itens que não são pessoa, lugar nem clube. */
  otherKind: number;
  unknownLang: number;
  /** IPA preenchido com texto que não é IPA (ex.: ideogramas no lugar da transcrição). */
  notIpa: number;
}

/** Ideogramas, kana e hangul no campo de IPA = erro de cadastro. */
const NON_IPA_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** Corrige erros comuns de digitação no IPA do Wikidata. */
function fixIpa(raw: string): string {
  return raw
    .trim()
    .replace(/^[/[\\]+|[/\]\\]+$/g, '') // delimitadores: barras, colchetes e barras invertidas (convenção francesa)
    .replace(/:/g, 'ː') // dois-pontos ASCII no lugar do sinal de vogal longa
    .replace(/-/g, ' ') // hífen de nome composto (Saint-Aubert) → separador de palavra
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
}

export function importWikidata(text: string): { entries: Entry[]; stats: WikidataStats } {
  const entries: Entry[] = [];
  const stats: WikidataStats = { rows: 0, entries: 0, otherKind: 0, unknownLang: 0, notIpa: 0 };
  const rankByKey = new Map<string, number>();
  const seen = new Set<string>();

  const lines = text.split(/\r?\n/);
  if (lines[0] !== 'qid\tcode\tlabel\tipa\thuman\tplace\tclub')
    throw new Error('Cabeçalho inesperado em p898.tsv');

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    stats.rows++;
    const [, code, label, rawIpa, human, place, club] = line.split('\t');
    if (human !== '1' && place !== '1' && club !== '1') {
      stats.otherKind++;
      continue;
    }
    const word = label.trim().normalize('NFC');
    for (const variant of rawIpa.split(/\s*[,;]\s*/)) {
      const ipa = fixIpa(variant);
      if (!word || !ipa) continue;
      if (NON_IPA_SCRIPT.test(ipa)) {
        stats.notIpa++;
        continue;
      }
      const langs = langsFor(code, ipa);
      if (langs.length === 0) stats.unknownLang++;
      for (const lang of langs) {
        const key = `${lang}\t${word}\t${ipa}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const rankKey = `${lang}\t${word}`;
        const rank = rankByKey.get(rankKey) ?? 0;
        rankByKey.set(rankKey, rank + 1);
        entries.push({ word, ipa, lang, source: 'wikidata', rank, kind: 'proper' });
      }
    }
  }
  stats.entries = entries.length;
  return { entries, stats };
}
