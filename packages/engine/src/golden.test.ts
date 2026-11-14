import { describe, expect, it } from 'vitest';
import {
  GOLDEN_HEADER,
  engineSyllabic,
  parseGolden,
  scoreGolden,
  serializeGolden,
  type GoldenRow,
} from './golden';

describe('golden sets', () => {
  const rows: GoldenRow[] = [
    { word: 'water', ipa: 'ˈwɔtɚ', expected: 'UÓ·rer', status: 'revisado', note: '' },
    { word: 'thank', ipa: 'ˈθæŋk', expected: 'FÉNK', status: 'revisado', note: 'revisor discorda do th' },
    { word: 'please', ipa: 'ˈpliz', expected: 'PLIZ', status: 'rascunho', note: '' },
  ];

  it('faz ida e volta no formato TSV', () => {
    const parsed = parseGolden(serializeGolden('en-US', rows));
    expect(parsed).toEqual({ lang: 'en-US', rows });
  });

  it('só as revisadas contam; registra os erros', () => {
    expect(scoreGolden('en-US', rows)).toEqual({
      lang: 'en-US',
      reviewed: 2,
      correct: 1,
      drafts: 1,
      misses: [{ word: 'thank', expected: 'FÉNK', got: 'THÉNK' }],
    });
  });

  it('a saída do motor usa a regra de tônica quando o IPA não marca', () => {
    expect(engineSyllabic('estasjon', 'es-419', 'estación')).toBe('ês·ta·SSIÔN');
    expect(engineSyllabic('ma.ny.ɛl vals', 'fr-FR', 'Manuel Valls')).toBe('ma·nü·ÉL VALS');
  });

  it('rejeita situação inválida', () => {
    const bad = `${GOLDEN_HEADER}\n#lang en-US\npalavra\tipa\tesperado\tsituação\tobservação\nx\tx\tX\tok\t\n`;
    expect(() => parseGolden(bad)).toThrow(/situação/);
  });
});
