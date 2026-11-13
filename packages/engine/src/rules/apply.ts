/**
 * Aplicação das regras (T3.5): sons silabados → segmentos de grafia PT-BR com rastreamento, destaques e armadilhas.
 * Ordem: mapeamento (1ª regra que casa) → ortografia (letras, atravessando sílabas) → armadilhas (todas).
 */
import type { Lang, TrapId } from '../types';
import type { Phone } from '../ipa/parse';
import type { IpaSyllable, SyllabifiedWord } from '../ipa/syllabify';
import { VOWELS } from '../ipa/symbols';
import { CORE_ORTHOGRAPHY, CORE_RULES, CORE_TRAPS } from './core';
import {
  contextMatches,
  letterIs,
  phoneMatches,
  type MapRule,
  type OrthoRule,
  type PhoneSite,
  type TrapRule,
} from './dsl';
import { PROFILES } from './profiles';

export interface RuleSet {
  lang: Lang;
  map: readonly MapRule[];
  orthography: readonly OrthoRule[];
  traps: readonly TrapRule[];
}

const cache = new Map<Lang, RuleSet>();

/** Regras efetivas de um idioma: perfil antes do núcleo comum. */
export function ruleSetFor(lang: Lang): RuleSet {
  const cached = cache.get(lang);
  if (cached) return cached;
  const profile = PROFILES[lang];
  const omit = new Set(profile?.omitTraps ?? []);
  const set: RuleSet = {
    lang,
    map: [...(profile?.rules ?? []), ...CORE_RULES],
    orthography: [...(profile?.orthography ?? []), ...CORE_ORTHOGRAPHY],
    traps: [...(profile?.traps ?? []), ...CORE_TRAPS].filter((t) => !omit.has(t.trap)),
  };
  cache.set(lang, set);
  return set;
}

export interface RuleSegment {
  /** Grafia PT-BR deste som (pode ser vazia: ʔ, j antes de i, 1ª da geminada). */
  text: string;
  /** Texto IPA do som de origem. */
  ipa: string;
  special: boolean;
  /** Regra(s) que produziram o texto: "θ", "s+R6-ss". "?" = nenhuma regra (reserva). */
  rule: string;
}

export interface RuleSyllable {
  segments: RuleSegment[];
  stress: 0 | 1 | 2;
  tone?: string;
}

export interface RuleWord {
  syllables: RuleSyllable[];
  traps: TrapId[];
  /** Bases sem regra (saíram pela reserva, destacadas). Vazio quando a tabela cobre tudo. */
  unmapped: string[];
}

function synthetic(base: string): Phone {
  return { kind: 'phone', text: base, base, vowel: VOWELS.has([...base][0]), features: [] };
}

/** Escolhe a regra de mapeamento de um som. */
function mapPhone(set: RuleSet, site: PhoneSite): { rule: MapRule | undefined; text: string } {
  const plain = (base: string): string => {
    const p = synthetic(base);
    const r = set.map.find((m) => !m.when && !m.with && phoneMatches(m, p));
    if (!r) return base;
    return typeof r.out === 'string' ? r.out : r.out({ phone: p, lang: set.lang, plain });
  };
  for (const rule of set.map) {
    if (!phoneMatches(rule, site.phone) || !contextMatches(rule.when, site)) continue;
    const text =
      typeof rule.out === 'string' ? rule.out : rule.out({ phone: site.phone, lang: set.lang, plain });
    return { rule, text };
  }
  return { rule: undefined, text: site.phone.base };
}

export function applyRules(word: SyllabifiedWord, lang: Lang): RuleWord {
  const set = ruleSetFor(lang);

  // Sítios: cada som com sua posição, vizinhos e o 1º som do ataque da sílaba seguinte.
  const flat: { phone: Phone; syl: number; slot: PhoneSite['slot'] }[] = [];
  word.syllables.forEach((s: IpaSyllable, i) => {
    for (const phone of s.onset) flat.push({ phone, syl: i, slot: 'onset' });
    for (const phone of s.nucleus) flat.push({ phone, syl: i, slot: 'nucleus' });
    for (const phone of s.coda) flat.push({ phone, syl: i, slot: 'coda' });
  });
  const sites: PhoneSite[] = flat.map((f, k) => ({
    phone: f.phone,
    slot: f.slot,
    stressed: word.syllables[f.syl].stress > 0,
    prev: flat[k - 1]?.phone,
    next: flat[k + 1]?.phone,
    nextOnset: word.syllables[f.syl + 1]?.onset[0],
    following: flat.slice(k + 1, k + 4).map((x) => x.phone),
  }));

  const traps: TrapId[] = [];
  const unmapped: string[] = [];
  const segments: RuleSegment[] = sites.map((site) => {
    const { rule, text } = mapPhone(set, site);
    if (!rule) unmapped.push(site.phone.base);
    for (const t of set.traps) {
      if (!traps.includes(t.trap) && phoneMatches(t, site.phone) && contextMatches(t.when, site))
        traps.push(t.trap);
    }
    // sem regra: a base sai destacada (visível, nunca some em silêncio)
    return { text, ipa: site.phone.text, special: rule ? !!rule.special : true, rule: rule?.id ?? '?' };
  });

  // Ortografia: sobre as letras da palavra inteira (pulando segmentos vazios).
  for (const o of set.orthography) {
    segments.forEach((seg, i) => {
      if (seg.text !== o.target) return;
      const before = segments
        .slice(0, i)
        .reverse()
        .find((s) => s.text)
        ?.text.slice(-1);
      const after = segments.slice(i + 1).find((s) => s.text)?.text[0];
      if (o.prev && !letterIs(before, o.prev)) return;
      if (o.next && !letterIs(after, o.next)) return;
      seg.text = o.out;
      seg.rule += `+${o.id}`;
    });
  }

  let k = 0;
  const syllables: RuleSyllable[] = word.syllables.map((s) => {
    const n = s.onset.length + s.nucleus.length + s.coda.length;
    const syl: RuleSyllable = { segments: segments.slice(k, k + n), stress: s.stress };
    if (s.tone) syl.tone = s.tone;
    k += n;
    return syl;
  });
  return { syllables, traps, unmapped };
}
