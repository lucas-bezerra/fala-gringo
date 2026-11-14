import { describe, expect, it } from 'vitest';
import { createEngine, placeholderPhonology } from '../engine';
import { renderPronunciation } from '../phonology';
import type { Dictionary } from '../stages';
import type { Lang } from '../types';
import { italianToIpa } from './italian';
import { chainEstimators, createRuleEstimator, ruleToIpa } from './rules';
import { spanishToIpa } from './spanish';

/** Grafia que a tela mostraria para a estimativa. */
const reading = (word: string, lang: Lang) => {
  const ipa = ruleToIpa(word, lang)!;
  return renderPronunciation(ipa, lang, 'none', word)
    .syllables.map((s) => s.text)
    .join('·');
};

describe('espanhol por regras (T5.1)', () => {
  it.each([
    ['quieres', 'es-ES', 'kjeɾes'],
    ['de', 'es-ES', 'de'],
    ['cerveza', 'es-ES', 'θeɾbeθa'],
    ['cerveza', 'es-419', 'seɾbesa'],
    ['guitarra', 'es-ES', 'ɡitara'],
    ['pingüino', 'es-ES', 'pinɡwino'],
    ['llamar', 'es-419', 'ʝamaɾ'],
    ['hoy', 'es-ES', 'oi'],
    ['ahora', 'es-ES', 'aoɾa'],
    ['jamón', 'es-ES', 'xamon'],
    ['actuar', 'es-ES', 'aɡtwaɾ'],
    ['acre', 'es-ES', 'akɾe'],
    ['examen', 'es-ES', 'eɡsamen'],
    ['país', 'es-ES', 'pa.is'],
    ['enviar', 'es-ES', 'embjaɾ'],
  ] as const)('%s (%s) → %s', (word, lang, ipa) => expect(spanishToIpa(word, lang)).toBe(ipa));

  it('a tônica vem da regra ortográfica do motor', () => {
    expect(reading('quieres', 'es-ES')).toBe('KIÊ·rês');
    expect(reading('jamón', 'es-ES')).toBe('ra·MÔN');
    expect(reading('Sánchez', 'es-ES')).toBe('SAN·tchêth');
    expect(reading('país', 'es-ES')).toBe('pa·IS');
  });

  it('recusa o que não é espanhol', () => {
    expect(spanishToIpa('r2d2', 'es-ES')).toBeUndefined();
    expect(spanishToIpa('москва', 'es-ES')).toBeUndefined();
  });
});

describe('italiano por regras (T5.2)', () => {
  it.each([
    ['ciao', 't͡ʃao'],
    ['giorno', 'd͡ʒorno'],
    ['gnocchi', 'ɲokki'],
    ['famiglia', 'famiʎʎa'],
    ['gli', 'ʎi'],
    ['scienza', 'ʃent͡sa'],
    ['acqua', 'akkwa'],
    ['grazie', 'ɡratt͡sje'],
    ['città', 't͡ʃittˈa'],
    ['perché', 'perkˈe'],
    ['organizzare', 'orɡaniddzare'.replace('ddz', 'dd͡z')],
    ['fotografia', 'fotoɡrafˈia'],
  ])('%s → %s', (word, ipa) => expect(italianToIpa(word)).toBe(ipa));

  it('grafia na tela: paroxítona por padrão, acento gráfico manda', () => {
    expect(reading('Mattarella', 'it-IT')).toBe('ma·ta·RÊ·la');
    expect(reading('però', 'it-IT')).toBe('pê·RÓ');
    expect(reading('Draghi', 'it-IT')).toBe('DRA·gui');
  });
});

describe('escolha de variante (prefer)', () => {
  const rules = createRuleEstimator();

  it('escolhe a variante do dicionário mais próxima do padrão', () => {
    expect(rules.prefer?.('la', 'es-ES', ['a', 'la'])).toBe(1);
    expect(rules.prefer?.('por', 'es-ES', ['po', 'poɾ'])).toBe(1);
    expect(rules.prefer?.('casa', 'es-ES', ['kasa', 'kaha'])).toBe(0);
  });

  it('sem regras para o idioma ou com uma só variante, não interfere', () => {
    expect(rules.prefer?.('water', 'en-US', ['ˈwɔtɚ', 'ˈwɑtɚ'])).toBeUndefined();
    expect(rules.prefer?.('la', 'es-ES', ['a'])).toBeUndefined();
  });

  it('o motor usa a variante escolhida como principal e mantém as outras', async () => {
    const dictionary: Dictionary = {
      lookup: async (_lang, key) =>
        key === 'la'
          ? {
              display: 'la',
              proper: false,
              prons: [
                { ipa: 'a', stress: 'none', source: 'wikipron', agree: 0 },
                { ipa: 'la', stress: 'none', source: 'wikipron', agree: 0 },
              ],
            }
          : undefined,
    };
    const engine = createEngine({ dictionary, phonology: placeholderPhonology, estimator: rules });
    const [t] = (await engine.convert('la', 'es-ES')).tokens;
    expect(t.kind === 'word' && [t.primary.ipa, t.variants.map((v) => v.ipa)]).toEqual(['la', ['a']]);
  });

  it('encadeia: regras primeiro, depois o próximo estimador', async () => {
    const next = { estimate: async (k: string) => (k === 'zelensky' ? 'zɪˈlɛnski' : undefined) };
    const chain = chainEstimators(rules, undefined, next);
    expect(await chain.estimate('quieres', 'es-ES')).toBe('kjeɾes');
    expect(await chain.estimate('zelensky', 'en-US')).toBe('zɪˈlɛnski');
    expect(await chain.estimate('qwxz', 'en-US')).toBeUndefined();
    expect(chain.prefer?.('la', 'es-ES', ['a', 'la'])).toBe(1);
  });
});
