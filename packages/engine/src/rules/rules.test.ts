import { describe, expect, it } from 'vitest';
import { LANGS } from '../../../data/src/schema';
import { parseIpa, type Phone } from '../ipa/parse';
import { syllabify } from '../ipa/syllabify';
import type { Lang } from '../types';
import { applyRules, ruleSetFor } from './apply';
import { CORE_RULES } from './core';
import { PROFILES } from './profiles';
import {
  compilePattern,
  contextMatches,
  patternExample,
  phoneMatches,
  type MapRule,
  type PhoneSite,
} from './dsl';

const phone = (ipa: string, lang?: Lang) => parseIpa(ipa, lang).find((t): t is Phone => t.kind === 'phone')!;

describe('DSL — padrões', () => {
  it('padrão em IPA: base igual e traços do padrão presentes no som', () => {
    expect(compilePattern('ɑ')(phone('ɑ̃'))).toBe(true); // o simples casa o nasal (por isso a ordem importa)
    expect(compilePattern('ɑ̃')(phone('ɑ'))).toBe(false);
    expect(compilePattern('iː')(phone('iː'))).toBe(true);
    expect(compilePattern('iː')(phone('i'))).toBe(false);
    expect(compilePattern('t͡ʃ')(phone('tʃ', 'en-US'))).toBe(true); // africada agrupada pelo idioma
    expect(compilePattern('aɪ')(phone('aɪ', 'en-US'))).toBe(true); // ditongo
  });

  it('classes e erros de carga', () => {
    expect(compilePattern('@nasal')(phone('m'))).toBe(true);
    expect(compilePattern('@i')(phone('ɪə', 'en-GB'))).toBe(true);
    expect(compilePattern('@obstruent')(phone('t͡s'))).toBe(true);
    expect(() => compilePattern('tʃ')).toThrow(/ligadura/);
    expect(() => compilePattern('@inexistente')).toThrow(/Classe/);
  });

  it('with e except', () => {
    const rule: MapRule = { id: 'x', match: '@consonant', with: ['aspirated'], except: 'k', out: '' };
    expect(phoneMatches(rule, phone('pʰ'))).toBe(true);
    expect(phoneMatches(rule, phone('p'))).toBe(false);
    expect(phoneMatches(rule, phone('kʰ'))).toBe(false);
  });

  it('contextos', () => {
    const site = (over: Partial<PhoneSite>): PhoneSite => ({
      phone: phone('t'),
      slot: 'onset',
      stressed: false,
      ...over,
    });
    expect(contextMatches({ wordInitial: true }, site({}))).toBe(true);
    expect(contextMatches({ wordInitial: true }, site({ prev: phone('a') }))).toBe(false);
    expect(contextMatches({ next: ['k', 'ɡ'] }, site({ next: phone('k') }))).toBe(true);
    expect(contextMatches({ nextOnset: '@nasal' }, site({ nextOnset: phone('m') }))).toBe(true);
    expect(contextMatches({ slot: 'coda' }, site({}))).toBe(false);
    expect(contextMatches({ geminate: true }, site({ next: phone('t͡s') }))).toBe(true); // t + t͡s
  });
});

/** Regras de `list` que nunca disparam porque uma anterior, sem condição, casa tudo o que elas casam. */
function shadowedIn(list: readonly MapRule[]): string[] {
  const out: string[] = [];
  list.forEach((later, j) => {
    const patterns = typeof later.match === 'string' ? [later.match] : later.match;
    for (const pat of patterns) {
      const ex = patternExample(pat); // classes não são enumeráveis: só padrões IPA
      if (!ex) continue;
      const probe: Phone = { ...ex, features: [...new Set([...ex.features, ...(later.with ?? [])])] };
      if (later.except && phoneMatches({ match: later.except }, probe)) continue;
      const blocker = list.slice(0, j).find((r) => !r.when && !r.with && !r.except && phoneMatches(r, probe));
      if (blocker) out.push(`"${later.id}" (${pat}) é sombreada por "${blocker.id}"`);
    }
  });
  return out;
}

describe('tabelas de regras — verificações estáticas', () => {
  // Perfil sobrepondo o núcleo é o mecanismo de sobrescrita por idioma (intencional): o sombreamento é
  // verificado DENTRO de cada camada — núcleo contra núcleo, perfil contra perfil.
  it('núcleo comum: nenhuma regra sombreada', () => {
    expect(shadowedIn(CORE_RULES)).toEqual([]);
  });

  it.each(LANGS)('%s: padrões válidos, ids únicos, nenhuma regra do perfil sombreada', (lang) => {
    const set = ruleSetFor(lang); // compila todos os padrões (erro de carga falharia aqui)
    const ids = set.map.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(shadowedIn(PROFILES[lang]?.rules ?? [])).toEqual([]);
  });
});

describe('applyRules — rastreamento, ortografia e reserva', () => {
  const run = (ipa: string, lang: Lang, word?: string) =>
    applyRules(syllabify(parseIpa(ipa, lang), lang, { word }).words[0], lang);

  it('cada segmento guarda a regra; R6 atravessa a sílaba', () => {
    const w = run('estaˈsjon', 'es-419', 'estación');
    const segs = w.syllables.flatMap((s) => s.segments);
    expect(segs.map((s) => s.rule)).toEqual(['e', 's', 'iguais', 'a', 's+R6-ss', 'j', 'o', 'iguais']);
    expect(segs.map((s) => s.text).join('')).toBe('êstassiôn');
  });

  it('som sem regra sai pela reserva: base destacada e listada', () => {
    const w = run('ə͡l', 'en-GB');
    expect(w.unmapped).toEqual(['ə͡l']);
    expect(w.syllables[0].segments[0]).toMatchObject({ text: 'ə͡l', special: true, rule: '?' });
  });
});
