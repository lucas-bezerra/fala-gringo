/**
 * Normalização de IPA e merge das fontes por idioma (T2.6).
 *
 * Estratégia: PRECEDÊNCIA POR PALAVRA. Cada palavra recebe as pronúncias da fonte de maior prioridade que a
 * tenha. Não misturamos variantes de fontes diferentes: convenções distintas (ex.: ɚ × ɝ) virariam "variantes"
 * falsas. As outras fontes que concordam com a pronúncia principal ficam em `agree` (indicador de confiança).
 * Decisões e números: ../MERGE.md
 */
import { lookupKey, type Entry, type EntryKind, type Lang } from './schema';
import type { SourceId } from './sources';
import { joinWithStress, type Segment } from './importers/englishStress';

/**
 * Prioridade das fontes por idioma — fontes com tônica primeiro; o WikiPron (sem tônica) só preenche lacunas.
 * en-US: o ipa-dict fica de fora — cobre exatamente as mesmas palavras do CMUdict, numa conversão mais antiga e
 * com menos informação (ɫ em todo l, sem ʌ nem ɚ).
 */
/**
 * Doadores de tônica entre variantes (T2.6): en-GB recebe o padrão de tônica do en-US (CMUdict) nas palavras
 * que só existem sem tônica (WikiPron), quando o número de sílabas coincide. Status `borrowed`.
 */
export const STRESS_DONORS: Partial<Record<Lang, Lang>> = { 'en-GB': 'en-US' };

export const PRIORITY: Record<Lang, SourceId[]> = {
  'en-US': ['cmudict', 'wikidata'],
  'en-GB': ['wiktextract', 'britfone', 'wikidata', 'wikipron'],
  'de-DE': ['ipa-dict', 'wikidata', 'wikipron'],
  'it-IT': ['wiktextract', 'wikidata', 'wikipron'],
  'es-ES': ['wikipron', 'wikidata'],
  'es-419': ['wikipron', 'wikidata'],
  'fr-FR': ['wikipron', 'wikidata'],
  'ja-JP': ['ipa-dict', 'wikidata'],
  'ko-KR': ['ipa-dict', 'wikidata'],
  'nl-NL': ['ipa-dict', 'wikidata'],
  'sv-SE': ['ipa-dict', 'wikidata'],
  'zh-CN': ['wikidata'],
};

/**
 * Normaliza o IPA de saída. Só unifica CONVENÇÕES (mesmo som, símbolo diferente);
 * nunca apaga informação que a notação usa (ligaduras de africadas, tônica, sílabas).
 */
export function normalizeIpa(ipa: string, lang: Lang, source: SourceId): string {
  let s = ipa.normalize('NFC').replace(/g/g, 'ɡ').replace(/:/g, 'ː');
  if (lang.startsWith('en-')) s = s.replace(/ɫ/g, 'l'); // L escuro é alofone previsível em inglês
  if (source === 'britfone') s = s.replace(/ɐ/g, 'ʌ'); // Britfone escreve a vogal de "cup" como ɐ; as outras fontes en-GB, ʌ
  // ~3% do WikiPron "britânico" vem com r rótico americano; no inglês britânico padrão (não rótico) ɚ = ə, ɝ = ɜː
  if (lang === 'en-GB') s = s.replace(/ɝ/g, 'ɜː').replace(/ɚ/g, 'ə');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Chave de comparação entre fontes: só os segmentos. Ignora tônica, sílaba, espaço, ligaduras, marcas de
 * silábico/não silábico e oclusiva glotal (convenções que variam entre fontes sem mudar a leitura).
 */
export function comparisonKey(ipa: string): string {
  return ipa
    .normalize('NFD')
    .replace(/[ˈˌ. ‿ʔ]/g, '')
    .replace(/\u0361|\u035C|\u0329|\u032F/g, '') // ligaduras, silábico, não silábico
    .replace(/ɫ/g, 'l')
    .replace(/g/g, 'ɡ')
    .normalize('NFC');
}

// Inclui ᵻ e ᵿ, vogais "redutoras" (ɪ/ə, ʊ/ə) usadas pelo Wiktionary.
const VOWELS = new Set([...'aeiouyæøœɐɑɒɔəɘɛɜɞɤɨɪɯɵɶʉʊʌʏɚɝᵻᵿ']);

/**
 * Número aproximado de núcleos silábicos: sequências de vogais (ditongo conta 1) mais consoantes silábicas (n̩).
 * Hiatos escritos sem "." contam como 1 — por isso o resultado é usado só para "precisa de tônica?".
 */
export function countNuclei(ipa: string): number {
  let count = 0;
  let inVowel = false;
  for (const ch of ipa.normalize('NFD')) {
    if (VOWELS.has(ch)) {
      if (!inVowel) count++;
      inVowel = true;
    } else if (ch === '\u0329') {
      count++; // consoante silábica (n̩)
    } else if (!(inVowel && /[\u0300-\u036fːˑ]/.test(ch))) {
      inVowel = false; // diacrítico ou comprimento dentro da vogal não encerra o núcleo
    }
  }
  return count;
}

/**
 * `marked` = a fonte traz ˈ/ˌ; `borrowed` = tônica emprestada de outra variante do idioma (ver borrowEnglishStress);
 * `mono` = monossílaba (dispensa); `none` = polissílaba sem tônica (precisa de regra no motor, T3.4).
 */
export type StressStatus = 'marked' | 'borrowed' | 'mono' | 'none';

export function stressStatus(ipa: string): StressStatus {
  if (/[ˈˌ]/.test(ipa)) return 'marked';
  return countNuclei(ipa) <= 1 ? 'mono' : 'none';
}

/** Padrão de tônica por núcleo silábico (0 átono, 1 primária, 2 secundária), lido de um IPA com ˈ/ˌ. */
export function stressPattern(ipa: string): (0 | 1 | 2)[] {
  const pattern: (0 | 1 | 2)[] = [];
  let pending: 0 | 1 | 2 = 0;
  let inVowel = false;
  for (const ch of ipa.normalize('NFD')) {
    if (ch === 'ˈ' || ch === 'ˌ') {
      pending = ch === 'ˈ' ? 1 : 2;
      inVowel = false;
    } else if (VOWELS.has(ch) || ch === '\u0329') {
      if (ch === '\u0329' || !inVowel) {
        pattern.push(pending);
        pending = 0;
      }
      inVowel = ch !== '\u0329';
    } else if (!(inVowel && /[\u0300-\u036fːˑ]/.test(ch))) {
      inVowel = false;
    }
  }
  return pattern;
}

/** Divide um IPA sem marcas em segmentos (consoantes, núcleos vocálicos) para reposicionar a tônica. */
function segmentize(ipa: string): { ipa: string; nucleus: boolean }[] | null {
  if (/[ˈˌ. ]/.test(ipa)) return null;
  const segs: { ipa: string; nucleus: boolean }[] = [];
  let joinNext = false;
  for (const ch of ipa.normalize('NFD')) {
    const last = segs[segs.length - 1];
    if (/[\u0300-\u036fːˑ]/.test(ch)) {
      if (!last) return null;
      last.ipa += ch;
      if (ch === '\u0361' || ch === '\u035C') joinNext = true; // ligadura: o próximo símbolo é do mesmo segmento
      if (ch === '\u0329') last.nucleus = true; // consoante silábica
    } else if (joinNext && last) {
      last.ipa += ch;
      joinNext = false;
    } else if (VOWELS.has(ch) && last?.nucleus && VOWELS.has([...last.ipa][0])) {
      last.ipa += ch; // ditongo/vogal longa: mesmo núcleo
    } else {
      segs.push({ ipa: ch, nucleus: VOWELS.has(ch) });
    }
  }
  return segs;
}

/**
 * Empresta a tônica de outra variante do inglês (ex.: en-US → en-GB) quando o número de núcleos silábicos
 * coincide. Copia só o PADRÃO (qual núcleo é tônico) e reposiciona as marcas no início da sílaba pela regra de
 * ataque máximo do inglês. Devolve `null` se não for possível alinhar com segurança.
 */
export function borrowEnglishStress(target: string, donor: string): string | null {
  const segs = segmentize(target);
  const pattern = stressPattern(donor);
  if (!segs || !pattern.includes(1)) return null;
  const nuclei = segs.filter((s) => s.nucleus);
  if (nuclei.length !== pattern.length) return null;
  let k = 0;
  const withStress: Segment[] = segs.map((s) => ({ ipa: s.ipa, stress: s.nucleus ? pattern[k++] : null }));
  return joinWithStress(withStress).normalize('NFC');
}

export interface MergedEntry {
  word: string;
  ipa: string;
  lang: Lang;
  /** Ordem entre as pronúncias da palavra. 0 = principal. */
  rank: number;
  /** Fonte escolhida para a palavra (a de maior prioridade que a tem). */
  source: SourceId;
  stress: StressStatus;
  kind: EntryKind;
  /** Outras fontes cuja pronúncia principal tem os mesmos segmentos que esta (só no rank 0). */
  agree: SourceId[];
}

export interface MergeReport {
  lang: Lang;
  words: number;
  entries: number;
  /** Palavras por fonte escolhida. */
  chosen: Partial<Record<SourceId, number>>;
  /** Palavras que a fonte tinha mas perderam para uma fonte de maior prioridade. */
  shadowed: Partial<Record<SourceId, number>>;
  stress: Record<StressStatus, number>;
  /** Palavras com pelo menos uma outra fonte concordando na pronúncia principal. */
  agreed: number;
  /** Palavras presentes em mais de uma fonte (base do percentual de concordância). */
  multiSource: number;
}

export function mergeLanguage(
  lang: Lang,
  bySource: ReadonlyMap<SourceId, readonly Entry[]>,
  priority: readonly SourceId[] = PRIORITY[lang],
  options: {
    /**
     * Pronúncia principal (com tônica) de outra variante do idioma, por chave de busca. Usada para emprestar a
     * tônica às pronúncias que ficaram sem ela (hoje: en-US → en-GB). Ver STRESS_DONORS.
     */
    stressDonor?: ReadonlyMap<string, string>;
  } = {},
): { entries: MergedEntry[]; report: MergeReport } {
  // palavra (chave de busca) → fonte → entradas ordenadas por rank
  const index = new Map<string, Map<SourceId, Entry[]>>();
  for (const source of priority) {
    for (const e of bySource.get(source) ?? []) {
      const key = lookupKey(e.word, lang);
      let perSource = index.get(key);
      if (!perSource) index.set(key, (perSource = new Map()));
      const list = perSource.get(source) ?? [];
      list.push(e);
      perSource.set(source, list);
    }
  }

  const entries: MergedEntry[] = [];
  const report: MergeReport = {
    lang,
    words: 0,
    entries: 0,
    chosen: {},
    shadowed: {},
    stress: { marked: 0, borrowed: 0, mono: 0, none: 0 },
    agreed: 0,
    multiSource: 0,
  };

  for (const key of [...index.keys()].sort()) {
    const perSource = index.get(key)!;
    const source = priority.find((s) => perSource.has(s))!;
    const chosen = [...perSource.get(source)!].sort((a, b) => a.rank - b.rank);
    const kind: EntryKind = [...perSource.values()].flat().some((e) => e.kind === 'proper')
      ? 'proper'
      : 'common';

    const primaryKey = comparisonKey(normalizeIpa(chosen[0].ipa, lang, source));
    const agree: SourceId[] = [];
    for (const [other, list] of perSource) {
      if (other === source) continue;
      report.shadowed[other] = (report.shadowed[other] ?? 0) + 1;
      const otherPrimary = list.reduce((a, b) => (b.rank < a.rank ? b : a));
      if (comparisonKey(normalizeIpa(otherPrimary.ipa, lang, other)) === primaryKey) agree.push(other);
    }
    if (perSource.size > 1) report.multiSource++;
    if (agree.length) report.agreed++;

    const seen = new Set<string>();
    let rank = 0;
    for (const e of chosen) {
      let ipa = normalizeIpa(e.ipa, lang, source);
      if (seen.has(ipa)) continue; // variantes que ficaram iguais após a normalização
      seen.add(ipa);
      let stress = stressStatus(ipa);
      const donor = stress === 'none' ? options.stressDonor?.get(key) : undefined;
      const borrowed = donor ? borrowEnglishStress(ipa, donor) : null;
      if (borrowed) {
        ipa = borrowed;
        stress = 'borrowed';
      }
      if (rank === 0) report.stress[stress]++;
      entries.push({
        word: chosen[0].word,
        ipa,
        lang,
        rank,
        source,
        stress,
        kind,
        agree: rank === 0 ? agree : [],
      });
      rank++;
    }
    report.chosen[source] = (report.chosen[source] ?? 0) + 1;
    report.words++;
  }
  report.entries = entries.length;
  return { entries, report };
}
