import { describe, expect, it } from 'vitest';
import { validateEntry } from '../schema';
import { importIpaDict } from './ipaDict';

describe('importIpaDict', () => {
  it('separa variantes em entradas com rank e remove barras', () => {
    const { entries } = importIpaDict("a\t/ˈeɪ/, /ə/\n'bout\t/ˈbaʊt/\n", 'en-US');
    expect(entries).toEqual([
      { word: 'a', ipa: 'ˈeɪ', lang: 'en-US', source: 'ipa-dict', rank: 0 },
      { word: 'a', ipa: 'ə', lang: 'en-US', source: 'ipa-dict', rank: 1 },
      { word: "'bout", ipa: 'ˈbaʊt', lang: 'en-US', source: 'ipa-dict', rank: 0 },
    ]);
  });

  it('troca o hífen do coreano por espaço e gera entradas válidas', () => {
    const { entries } = importIpaDict('구름-땅 방전\t/kuɾɯm-t͈a̠ŋ pa̠ŋd͡ʑʌ̹n/', 'ko-KR');
    expect(entries[0].ipa).toBe('kuɾɯm t͈a̠ŋ pa̠ŋd͡ʑʌ̹n');
    expect(validateEntry(entries[0])).toEqual([]);
  });

  it('normaliza para NFC e descarta variantes repetidas', () => {
    const { entries } = importIpaDict('bõ\t/bõ/, /bõ/', 'de-DE');
    expect(entries).toHaveLength(1);
    expect(entries[0].ipa).toBe('bõ');
  });

  it('pula linhas sem tab ou sem IPA e conta', () => {
    const { entries, stats } = importIpaDict('sem-tab\nvazio\t\nok\t/ok/\n\n', 'en-US');
    expect(entries.map((e) => e.word)).toEqual(['ok']);
    expect(stats).toEqual({ lines: 3, entries: 1, skipped: 2 });
  });
});
