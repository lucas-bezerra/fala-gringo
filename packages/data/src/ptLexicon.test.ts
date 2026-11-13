import { describe, expect, it } from 'vitest';
import { PT_CORE, buildPtLexicon, parsePtLexicon, serializePtLexicon } from './ptLexicon';

describe('buildPtLexicon', () => {
  // Posições reais aproximadas (FrequencyWords 2018): the é a 3ª em inglês e a 486ª no português.
  const pad = (n: number) => Array.from({ length: n }, (_, i) => `x${i}`);
  const ptFrequency = [
    'que',
    'de',
    'não',
    ...pad(100),
    'das',
    ...pad(150),
    'vem', // ~256ª no português (real)
    ...pad(230),
    'the',
    ...pad(500),
    'correspondentes',
    'massachusetts',
    'estado',
  ];
  const otherFrequency = {
    en: ['you', 'i', 'the', 'to', ...pad(10)],
    de: ['ich', 'die', 'das'],
    es: ['de', 'que', ...pad(160), 'estado'],
    sv: [...pad(85), 'vem'],
  };
  const wikipronWords = ['estado', 'casa', 'Massachusetts', 'Londres', 'paris', 'Paris'];
  const lex = buildPtLexicon({ ptFrequency, otherFrequency, wikipronWords });
  const has = (w: string) => lex.words.includes(w);

  it('inclui palavras de dicionário (WikiPron) e flexões frequentes (legendas)', () => {
    expect(has('casa')).toBe(true);
    expect(has('estado')).toBe(true); // também é espanhol, mas está no dicionário PT
    expect(has('correspondentes')).toBe(true); // flexão que o WikiPron não tem
  });

  it('remove ruído estrangeiro: muito mais frequente em outra língua', () => {
    expect(has('the')).toBe(false);
    expect(lex.noise).toContain('the');
    expect(has('vem')).toBe(true); // 85ª no sueco × ~256ª no português: diferença < 10×
  });

  it('protege as palavras funcionais do português', () => {
    expect(has('das')).toBe(true); // 2ª no alemão, mas é PT_CORE
    expect(has('de')).toBe(true);
    for (const w of ['a', 'o', 'e', 'em']) expect(has(w)).toBe(true);
    expect(PT_CORE).toContain('das');
  });

  it('não trata nome próprio como palavra comum', () => {
    expect(has('massachusetts')).toBe(false);
    expect(lex.properOnly).toContain('massachusetts');
    expect(has('londres')).toBe(false); // só como nome próprio no WikiPron
    expect(has('paris')).toBe(true); // existe também em minúscula no WikiPron
  });

  it('guarda os nomes próprios do português à parte e faz ida e volta', () => {
    expect(lex.names).toEqual(['londres', 'massachusetts']);
    const parsed = parsePtLexicon(serializePtLexicon(lex));
    expect([...parsed.words]).toEqual(lex.words);
    expect([...parsed.names]).toEqual(lex.names);
  });
});
