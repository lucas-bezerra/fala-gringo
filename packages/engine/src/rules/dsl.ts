/**
 * DSL das regras IPA → PT-BR (T3.5). Desenho e motivos: docs/adr/0002-motor-de-regras.md.
 *
 * Padrão = IPA (analisado pelo próprio parser: base igual + traços do padrão presentes no som) ou classe ("@vowel").
 * Mapeamento: a PRIMEIRA regra que casa vence (perfil do idioma antes do núcleo comum).
 * Ortografia: opera sobre as LETRAS geradas, atravessando sílabas (R6 ss, R8 gu).
 * Armadilhas: TODAS as que casam valem.
 */
import type { Lang, TrapId } from '../types';
import { parseIpa, type Phone } from '../ipa/parse';
import { FRICATIVES, GLIDES, LIQUIDS, NASALS, STOPS, TIE } from '../ipa/symbols';

/** Classes de sons usáveis nos padrões. */
export const CLASSES = {
  '@any': () => true,
  '@vowel': (p: Phone) => p.vowel,
  '@consonant': (p: Phone) => !p.vowel,
  '@stop': (p: Phone) => !p.vowel && !p.base.includes(TIE) && STOPS.has(first(p)),
  '@affricate': (p: Phone) => !p.vowel && p.base.includes(TIE),
  '@fricative': (p: Phone) => !p.vowel && !p.base.includes(TIE) && FRICATIVES.has(first(p)),
  '@obstruent': (p: Phone) =>
    !p.vowel && (p.base.includes(TIE) || STOPS.has(first(p)) || FRICATIVES.has(first(p))),
  '@nasal': (p: Phone) => !p.vowel && NASALS.has(first(p)),
  '@liquid': (p: Phone) => !p.vowel && LIQUIDS.has(first(p)),
  '@glide': (p: Phone) => !p.vowel && GLIDES.has(first(p)),
  /** Vogal que começa com i (inclui ditongos ɪə): para "j some antes de i" e a armadilha TI_DI. */
  '@i': (p: Phone) => p.vowel && 'iɪᵻ'.includes(first(p)),
  /** Vogal que começa com u: "w some antes de u". */
  '@u': (p: Phone) => p.vowel && 'uʊᵿ'.includes(first(p)),
  /** Ditongo (núcleo agrupado com mais de uma vogal). */
  '@diphthong': (p: Phone) => p.vowel && [...p.base].length > 1,
} as const;
export type ClassName = keyof typeof CLASSES;

function first(p: Phone): string {
  return [...p.base][0];
}

/** Padrão: som em IPA ("ɔ̃", "t͡ʃ", "iː"), classe ("@nasal") ou lista deles. */
export type Matcher = string | readonly string[];

export interface Context {
  /** Posição na sílaba. */
  slot?: 'onset' | 'nucleus' | 'coda';
  /** Primeiro / último som da palavra de IPA. */
  wordInitial?: boolean;
  wordFinal?: boolean;
  /** A sílaba do som é tônica (primária ou secundária). */
  stressed?: boolean;
  /** Som anterior / seguinte na palavra (atravessando sílabas). */
  prev?: Matcher;
  next?: Matcher;
  /** Primeiro som do ataque da sílaba seguinte (ex.: antinasalização). */
  nextOnset?: Matcher;
  /** O próximo som começa com a mesma consoante (geminada: kk, t + t͡s). */
  geminate?: boolean;
  /** Sequência de sons logo depois deste: `after: ['ə', 'n']` = seguido de "ən" (flap não ocorre em "Biden"). */
  after?: readonly Matcher[];
}

export interface OutContext {
  phone: Phone;
  lang: Lang;
  /** Grafia sem contexto de uma base (1ª regra sem `when` que a casa) — para compor saídas. */
  plain(base: string): string;
}

/** Campos comuns às regras de mapeamento e de armadilha. */
interface PhoneRule {
  match: Matcher;
  /** Traços exigidos no som (para padrões por classe: "@consonant" + ["syllabic"]). */
  with?: readonly string[];
  /** Sons excluídos do padrão. */
  except?: Matcher;
  when?: Context;
}

export interface MapRule extends PhoneRule {
  /** Identificador estável (aparece no rastreamento e nos testes). */
  id: string;
  /** Grafia PT-BR. Função só quando a saída deriva de outra (vogal longa do japonês, ditongo composto). */
  out: string | ((ctx: OutContext) => string);
  /** Som que não existe no PT-BR de mídia → destaque laranja (notação 5.1). */
  special?: boolean;
}

export interface TrapRule extends PhoneRule {
  trap: TrapId;
}

export type LetterClass = 'vowel' | 'front' | 'consonant';

export interface OrthoRule {
  id: string;
  /** Texto exato do segmento a reescrever (ex.: "s", "g"). */
  target: string;
  /** Classe da letra anterior / seguinte na palavra (pulando segmentos vazios). */
  prev?: LetterClass;
  next?: LetterClass;
  out: string;
}

export interface Profile {
  lang: Lang;
  rules?: readonly MapRule[];
  orthography?: readonly OrthoRule[];
  traps?: readonly TrapRule[];
  /** Armadilhas do núcleo que não se aplicam a este idioma. */
  omitTraps?: readonly TrapId[];
}

// ---------------------------------------------------------------------------------------------------------------
// Compilação e casamento

export type PhoneTest = (p: Phone) => boolean;

const compiled = new Map<string, PhoneTest>();
const examples = new Map<string, Phone>();

/** Som de exemplo de um padrão IPA (base + traços do padrão); `undefined` para classes. Usado no teste de sombreamento. */
export function patternExample(pattern: string): Phone | undefined {
  compilePattern(pattern);
  return examples.get(pattern);
}

/** Compila um padrão. Erro se o padrão IPA não for exatamente um som (ex.: "tʃ" sem ligadura → use "t͡ʃ"). */
export function compilePattern(pattern: string): PhoneTest {
  const cached = compiled.get(pattern);
  if (cached) return cached;
  let test: PhoneTest;
  if (pattern.startsWith('@')) {
    const cls = CLASSES[pattern as ClassName];
    if (!cls) throw new Error(`Classe desconhecida no padrão: ${pattern}`);
    test = cls;
  } else {
    const tokens = parseIpa(pattern);
    const phones = tokens.filter((t): t is Phone => t.kind === 'phone');
    // Só vogais = ditongo ("aɪ"): o parser só agrupa ditongos quando conhece o idioma, então agrupamos aqui.
    const diphthong = phones.length > 1 && phones.every((p) => p.vowel);
    if (tokens.length !== phones.length || (phones.length !== 1 && !diphthong)) {
      throw new Error(
        `Padrão "${pattern}" não é um som só (${phones.length} sons). Africada? Use a ligadura: t͡ʃ.`,
      );
    }
    const ref = diphthong
      ? {
          base: phones.map((p) => p.base).join(''),
          features: [...new Set(phones.flatMap((p) => p.features))].filter((f) => f !== 'nonSyllabic'),
          tone: undefined,
        }
      : phones[0];
    test = (p) =>
      p.base === ref.base &&
      ref.features.every((f) => p.features.includes(f)) &&
      (!ref.tone || p.tone === ref.tone);
    examples.set(pattern, {
      kind: 'phone',
      text: pattern,
      base: ref.base,
      vowel: diphthong || phones[0].vowel,
      features: [...ref.features],
    });
  }
  compiled.set(pattern, test);
  return test;
}

export function compileMatcher(m: Matcher): PhoneTest {
  const tests = (typeof m === 'string' ? [m] : m).map(compilePattern);
  return (p) => tests.some((t) => t(p));
}

/** Posição de um som dentro da palavra silabada — o que as condições `when` consultam. */
export interface PhoneSite {
  phone: Phone;
  slot: 'onset' | 'nucleus' | 'coda';
  stressed: boolean;
  prev?: Phone;
  next?: Phone;
  /** 1º som do ataque da próxima sílaba (undefined se não houver próxima sílaba ou ataque). */
  nextOnset?: Phone;
  /** Sons seguintes na palavra, em ordem (next = following[0]). */
  following?: readonly Phone[];
}

/** O som casa com o padrão, os traços exigidos e as exclusões (sem olhar o contexto). */
export function phoneMatches(rule: PhoneRule, p: Phone): boolean {
  if (!compileMatcher(rule.match)(p)) return false;
  if (rule.with && !rule.with.every((f) => p.features.includes(f))) return false;
  if (rule.except && compileMatcher(rule.except)(p)) return false;
  return true;
}

export function contextMatches(when: Context | undefined, site: PhoneSite): boolean {
  if (!when) return true;
  if (when.slot && when.slot !== site.slot) return false;
  if (when.wordInitial !== undefined && when.wordInitial !== !site.prev) return false;
  if (when.wordFinal !== undefined && when.wordFinal !== !site.next) return false;
  if (when.stressed !== undefined && when.stressed !== site.stressed) return false;
  if (when.prev && !(site.prev && compileMatcher(when.prev)(site.prev))) return false;
  if (when.next && !(site.next && compileMatcher(when.next)(site.next))) return false;
  if (when.nextOnset && !(site.nextOnset && compileMatcher(when.nextOnset)(site.nextOnset))) return false;
  if (when.after) {
    const following = site.following ?? (site.next ? [site.next] : []);
    if (!when.after.every((m, i) => following[i] && compileMatcher(m)(following[i]))) return false;
  }
  if (when.geminate !== undefined) {
    const n = site.next;
    const gem = !!n && !n.vowel && !site.phone.vowel && n.base.startsWith(site.phone.base);
    if (gem !== when.geminate) return false;
  }
  return true;
}

// Letras (camada ortográfica)
const VOWEL_LETTERS = new Set([...'aeiouáéíóúâêôãõẽüày']);
const FRONT_LETTERS = new Set([...'eiéíêẽ']);

export function letterIs(letter: string | undefined, cls: LetterClass): boolean {
  if (!letter) return false;
  const l = letter.toLowerCase();
  if (cls === 'vowel') return VOWEL_LETTERS.has(l);
  if (cls === 'front') return FRONT_LETTERS.has(l);
  return /\p{L}/u.test(l) && !VOWEL_LETTERS.has(l);
}
