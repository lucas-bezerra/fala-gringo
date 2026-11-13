/**
 * Silabação e tônica (T3.4). Entrada: tokens do parser (T3.3). Saída: palavras de IPA → sílabas com ataque,
 * núcleo, coda e tônica.
 *
 * FRONTEIRAS: o "." da fonte manda; onde falta, princípio do ataque máximo com os encontros do idioma.
 * As marcas ˈ/ˌ NÃO definem fronteira — só dizem qual núcleo é tônico. Motivo: há fontes que marcam dentro do
 * encontro (sueco "akˈoːɖ", cuja divisão é "a.ˈkoːɖ").
 * TÔNICA sem marca na fonte: regra do idioma (espanhol pela ortografia; francês na última; etc.), medida contra
 * os dados que têm tônica — ver SYLLABLES.md.
 */
import { isLegalOnset as englishOnset } from '@falagringo/data/englishStress';
import type { Lang, StressSource } from '../types';
import type { IpaToken, Phone } from './parse';
import { TIE } from './symbols';

export interface IpaSyllable {
  onset: Phone[];
  nucleus: Phone[];
  coda: Phone[];
  /** 0 átona, 1 primária, 2 secundária. */
  stress: 0 | 1 | 2;
  /** Tom (zh) ou acento tonal (sv, "²") que segue a sílaba. */
  tone?: string;
}

export interface SyllabifiedWord {
  syllables: IpaSyllable[];
}

export interface SyllabifyResult {
  words: SyllabifiedWord[];
  /** De onde veio a tônica (para a interface e a confiança). */
  stress: StressSource;
}

export interface SyllabifyOptions {
  /** Grafia original — usada pela regra de tônica do espanhol (acento gráfico). */
  word?: string;
  /** Status da tônica no dado (`ShardDictionary`): `dictionary`, `borrowed` ou `none`. */
  stress?: Exclude<StressSource, 'rule'>;
}

/** Idiomas sem acento de intensidade: nunca recebem tônica (notação, seção 3.1). */
export const NO_STRESS: ReadonlySet<Lang> = new Set(['ja-JP', 'ko-KR', 'zh-CN']);

/** Idiomas em que consoante + semivogal abre sílaba (kj, pw, nj): latinas e asiáticas; não de, nl, sv. */
const GLIDE_ONSET: ReadonlySet<Lang> = new Set([
  'es-ES',
  'es-419',
  'it-IT',
  'fr-FR',
  'ja-JP',
  'ko-KR',
  'zh-CN',
]);
/** Sons que nunca abrem sílaba. */
const NEVER_ONSET = new Set(['ŋ', 'ɴ']);

const STOPS = new Set([...'pbtdkɡqcɟʔʈɖɓ']);
const FRICATIVES = new Set([...'fvθðszʃʒçxɣχhɦɸβɕʑʂʐħʕʝ']);
const NASALS = new Set([...'mnŋɲɴɱɳ']);
const LIQUIDS = new Set([...'lrɾɹʎɭɫʀɺɻʁʙ']); // ʁ se comporta como líquida nos encontros (tʁ, bʁ, ʃtʁ)
const GLIDES = new Set([...'jwɥɰʋ']);

const isNucleus = (p: Phone) =>
  (p.vowel && !p.features.includes('nonSyllabic')) || p.features.includes('syllabic');

/** Sonoridade: 1 oclusiva/africada · 2 fricativa · 3 nasal · 4 líquida · 5 semivogal (ou vogal não silábica). */
function sonority(p: Phone): number {
  if (p.vowel) return 5; // vogal não silábica (u̯, i̯) funciona como semivogal
  if (p.base.includes(TIE)) return 1;
  const c = [...p.base][0];
  if (STOPS.has(c)) return 1;
  if (FRICATIVES.has(c)) return 2;
  if (NASALS.has(c)) return 3;
  if (LIQUIDS.has(c)) return 4;
  if (GLIDES.has(c)) return 5;
  return 2;
}

/** Encontro pode abrir sílaba neste idioma? */
export function legalOnset(cluster: readonly Phone[], lang: Lang): boolean {
  if (cluster.length === 0) return true;
  if (NEVER_ONSET.has(cluster[0].base)) return false;
  if (lang.startsWith('en-')) {
    // mesma lista usada para posicionar a tônica do CMUdict/Britfone (coerência entre dado e motor)
    return englishOnset(cluster.map((p) => p.base.replace(TIE, '').replace(/^r$/, 'ɹ')));
  }
  if (cluster.length > 3) return false;
  // Entre vogais, s + consoante NÃO abre sílaba: "a.ɡos.ta", "krɪs.tə" (medido: it 95,5% → 99,8%).
  // No início da palavra o problema não existe — todas as consoantes iniciais vão para a 1ª sílaba.
  // Exceção alemã: ʃ + oclusiva no meio da palavra quase sempre vem depois de prefixo (be·stimmt, Ge·spräch).
  let rest = cluster;
  if (lang === 'de-DE' && cluster.length >= 2 && cluster[0].base === 'ʃ' && sonority(cluster[1]) === 1) {
    rest = cluster.slice(1);
  }
  if (rest.length === 1) return true;
  // Encontro: obstruinte (ou nasal, antes de semivogal) + líquida/semivogal, em sonoridade crescente.
  // Medido no italiano: aceitar oclusiva+fricativa/nasal ("ab.si.de", "ak.me") errava as fronteiras da fonte.
  for (let i = 1; i < rest.length; i++) {
    const cur = sonority(rest[i]);
    if (cur <= sonority(rest[i - 1]) || cur < 4) return false;
    if (cur === 5 && !GLIDE_ONSET.has(lang)) return false; // "aː.bɪl.jɛt", não "bɪ.ljɛt" (holandês)
  }
  return rest.length <= 2 || sonority(rest[2]) === 5;
}

/** Divide uma palavra de IPA (sem espaços) em sílabas. */
function syllabifyWord(
  tokens: readonly IpaToken[],
  lang: Lang,
): { syllables: IpaSyllable[]; marked: boolean } {
  // Segmentos entre "." da fonte; dentro deles, ataque máximo. Marcas de tônica valem para o próximo núcleo.
  type Item = { phone: Phone; stressBefore: 0 | 1 | 2; boundaryBefore: boolean };
  const items: Item[] = [];
  const tones = new Map<number, string>(); // índice do item após o qual vem o tom
  let pendingStress: 0 | 1 | 2 = 0;
  let pendingBoundary = false;
  let marked = false;
  for (const t of tokens) {
    if (t.kind === 'phone') {
      items.push({ phone: t, stressBefore: 0, boundaryBefore: pendingBoundary });
      pendingBoundary = false;
      if (pendingStress && isNucleus(t)) {
        items[items.length - 1].stressBefore = pendingStress;
        pendingStress = 0;
      }
    } else if (t.kind === 'stress') {
      pendingStress = t.level;
      marked = true;
    } else if (t.kind === 'syllable') {
      // Inglês: o Wiktionary usa a convenção de Wells ("ˈæb.ə"), o CMUdict/Britfone não têm pontos; para não
      // misturar convenções no mesmo idioma, o inglês usa sempre o ataque máximo ("æ.bə", como lê o brasileiro).
      pendingBoundary = items.length > 0 && !lang.startsWith('en-');
    } else if (t.kind === 'tone' && items.length) {
      tones.set(items.length - 1, t.text);
    }
  }

  const nuclei = items.map((it, i) => (isNucleus(it.phone) ? i : -1)).filter((i) => i >= 0);
  if (nuclei.length === 0) {
    // sem vogal (interjeição "hm", "brr" sem marca de silábico): uma sílaba só
    return {
      syllables: items.length ? [{ onset: items.map((i) => i.phone), nucleus: [], coda: [], stress: 0 }] : [],
      marked,
    };
  }

  // Início de cada sílaba (índice do item onde ela começa).
  const starts: number[] = [0];
  for (let k = 1; k < nuclei.length; k++) {
    const prev = nuclei[k - 1];
    const cur = nuclei[k];
    const explicit = items.slice(prev + 1, cur + 1).findIndex((it) => it.boundaryBefore);
    if (explicit >= 0) {
      starts.push(prev + 1 + explicit); // "." da fonte
      continue;
    }
    const cluster = items.slice(prev + 1, cur).map((it) => it.phone);
    let onsetStart = cur;
    for (let s = 0; s <= cluster.length; s++) {
      if (legalOnset(cluster.slice(s), lang)) {
        onsetStart = prev + 1 + s;
        break;
      }
    }
    starts.push(onsetStart);
  }

  const syllables: IpaSyllable[] = starts.map((start, k) => {
    const end = k + 1 < starts.length ? starts[k + 1] : items.length;
    const slice = items.slice(start, end);
    const n = nuclei[k] - start;
    const syl: IpaSyllable = {
      onset: slice.slice(0, n).map((i) => i.phone),
      nucleus: [slice[n].phone],
      coda: slice.slice(n + 1).map((i) => i.phone),
      stress: slice[n].stressBefore,
    };
    for (let i = start; i < end; i++) if (tones.has(i)) syl.tone = tones.get(i);
    return syl;
  });
  return { syllables, marked };
}

/** Separa por espaço/pausa/ligação em palavras de IPA. */
function splitWords(tokens: readonly IpaToken[]): IpaToken[][] {
  const words: IpaToken[][] = [[]];
  for (const t of tokens) {
    if (t.kind === 'space' || t.kind === 'prosody' || t.kind === 'link') words.push([]);
    else words[words.length - 1].push(t);
  }
  return words.filter((w) => w.some((t) => t.kind === 'phone'));
}

/**
 * Posição da tônica pela ortografia do espanhol, contada do fim (1 = última sílaba).
 * Grupos vocálicos: vogais adjacentes formam um grupo (ditongo), exceto duas fortes (a, e, o) ou com í/ú
 * acentuada (hiato: país, día). Acento gráfico manda; sem acento, palavra terminada em vogal, n ou s é
 * paroxítona e as demais, oxítonas.
 */
export function spanishStressFromEnd(word: string): number | undefined {
  const w = word.normalize('NFC').toLocaleLowerCase('es');
  const STRONG = new Set([...'aeoáéóíú']); // í/ú acentuadas valem como fortes (formam hiato)
  const VOWEL = new Set([...'aeiouáéíóúü']);
  const groups: boolean[] = []; // acentuado?
  let prev: string | undefined;
  for (const ch of w) {
    if (!VOWEL.has(ch)) {
      prev = undefined;
      continue;
    }
    const accented = 'áéíóú'.includes(ch);
    const joins = prev !== undefined && !(STRONG.has(prev) && STRONG.has(ch));
    if (joins) groups[groups.length - 1] ||= accented;
    else groups.push(accented);
    prev = ch;
  }
  if (groups.length === 0) return undefined;
  const acc = groups.indexOf(true);
  if (acc >= 0) return groups.length - acc;
  return /[aeiouns]$/u.test(w) ? Math.min(2, groups.length) : 1;
}

/** Núcleo reduzido (schwa, vogal "redutora", consoante silábica): raramente tônico nas germânicas. */
const REDUCED = new Set(['ə', 'ɐ', 'ᵻ', 'ᵿ', 'ɚ']);
const isReduced = (s: IpaSyllable) =>
  !s.nucleus[0] || REDUCED.has(s.nucleus[0].base) || s.nucleus[0].features.includes('syllabic');
const firstFull = (syls: readonly IpaSyllable[]) =>
  Math.max(
    0,
    syls.findIndex((s) => !isReduced(s)),
  );

/** Inglês: sufixos pela grafia + 1ª sílaba não reduzida. Medido: 78,9% (en-US), 69,8% (en-GB) — SYLLABLES.md. */
function englishRule(syls: readonly IpaSyllable[], word: string | undefined): number {
  const n = syls.length;
  const w = (word ?? '').toLowerCase();
  if (/(ee|eer|ese|ette|esque|oon|ique|aire|eur)s?$/u.test(w)) return n - 1; // tônica no sufixo
  if (/ically$/u.test(w) && n >= 4) return n - 4;
  if (/(ity|ety|ical|ify|ology|onomy|ometer)s?$/u.test(w) && n >= 3) return n - 3; // antepenúltima
  if (/(tion|sion|cian|tial|cial|tious|cious|ic|ics|ial|ian|ient|ience|ior|ium|ious|eous|uous)s?$/u.test(w))
    return n - 2;
  return firstFull(syls);
}

/** Regra de tônica do idioma quando a fonte não marca. Devolve o índice da sílaba tônica. */
function ruleStress(lang: Lang, syls: readonly IpaSyllable[], word: string | undefined): number {
  const count = syls.length;
  if (count <= 1) return 0;
  switch (lang) {
    case 'es-ES':
    case 'es-419': {
      const fromEnd = word ? spanishStressFromEnd(word) : undefined;
      return fromEnd !== undefined && fromEnd <= count ? count - fromEnd : count - 2;
    }
    case 'fr-FR':
      return count - 1; // última sílaba
    case 'it-IT':
      return count - 2; // paroxítona (a mais comum: 69,5%)
    case 'en-US':
    case 'en-GB':
      return englishRule(syls, word);
    default:
      return firstFull(syls); // de, nl, sv: 1ª sílaba não reduzida (pula be-/ge-/ver-)
  }
}

export function syllabify(
  tokens: readonly IpaToken[],
  lang: Lang,
  options: SyllabifyOptions = {},
): SyllabifyResult {
  const parts = splitWords(tokens).map((w) => syllabifyWord(w, lang));
  const words = parts.map((p) => ({ syllables: p.syllables }));
  if (NO_STRESS.has(lang)) {
    for (const w of words) for (const s of w.syllables) s.stress = 0;
    return { words, stress: 'none' };
  }
  const anyMarked = parts.some((p) => p.marked);
  const total = words.reduce((n, w) => n + w.syllables.length, 0);
  if (anyMarked || total <= 1) {
    // Monossílabo sem marca: tônica implícita (é a única sílaba).
    for (const w of words) if (w.syllables.length === 1 && !anyMarked) w.syllables[0].stress = 1;
    return { words, stress: options.stress === 'borrowed' ? 'borrowed' : 'dictionary' };
  }
  // Sem marca: regra do idioma, aplicada a cada palavra de IPA (a grafia só serve para a 1ª palavra).
  const orth = options.word?.split(/[\s-]+/u) ?? [];
  words.forEach((w, i) => {
    const idx = ruleStress(lang, w.syllables, orth[i]);
    if (idx >= 0 && w.syllables[idx]) w.syllables[idx].stress = 1;
  });
  return { words, stress: 'rule' };
}
