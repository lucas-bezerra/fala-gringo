import { describe, expect, it } from 'vitest';
import { lookupKey, validateEntry, type Entry } from './schema';
import { FORMAT_HEADER, parseTsv, serializeTsv } from './tsv';

const base: Entry = { word: 'water', ipa: 'ˈwɑɾɚ', lang: 'en-US', source: 'cmudict', rank: 0 };
const errors = (e: Entry) => validateEntry(e).filter((i) => i.severity === 'error');

describe('validateEntry', () => {
  it('aceita uma entrada válida', () => {
    expect(validateEntry(base)).toEqual([]);
  });

  it('aceita IPA com diacríticos, nasais, tons e marcas de sílaba', () => {
    for (const ipa of [
      'bɔ̃.ʒuʁ',
      'ɡozaimasɯ̥',
      'p͈aŋ',
      'tɕʰa˥˩',
      'ˌmæsəˈtʃusɪts',
      'ɾaːmeɴ',
      'ʃõ',
      'ˈɡʁøːsə',
      'ɸɯᵝ',
      '²ˈhɛːstar',
      'ja | nain ‖ ↗ja ↘',
    ]) {
      // os 5 últimos são casos reais de de, ja e sv
      expect(validateEntry({ ...base, ipa }), ipa).toEqual([]);
    }
  });

  it.each([
    ['palavra vazia', { word: '' }, 'word'],
    ['palavra com tab', { word: 'wa\tter' }, 'word'],
    ['IPA com barras', { ipa: '/ˈwɑɾɚ/' }, 'ipa'],
    ['IPA com variantes em vírgula', { ipa: 'ˈeɪ, ə' }, 'ipa'],
    ['IPA fora de NFC', { ipa: 'bõ' }, 'ipa'],
    ['idioma não suportado', { lang: 'pt-PT' }, 'lang'],
    ['fonte não registrada', { source: 'ro-marephor' }, 'source'],
    ['rank negativo', { rank: -1 }, 'rank'],
    ['rank fracionário', { rank: 0.5 }, 'rank'],
    ['freq negativa', { freq: -2 }, 'freq'],
    ['kind inválido', { kind: 'nome' }, 'kind'],
  ])('rejeita %s', (_label, patch, field) => {
    const issues = errors({ ...base, ...patch } as Entry);
    expect(issues.map((i) => i.field)).toContain(field);
  });

  it('avisa (sem rejeitar) sobre caracteres fora do IPA esperado', () => {
    const issues = validateEntry({ ...base, ipa: 'kam-sa' }); // hífen, como no ko.txt
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: 'warning', field: 'ipa' });
    expect(issues[0].message).toContain('U+002D');
  });
});

describe('lookupKey', () => {
  it('normaliza para NFC e minúsculas', () => {
    expect(lookupKey('Wörter', 'de-DE')).toBe('wörter');
  });
});

describe('TSV', () => {
  const entries: Entry[] = [
    { ...base },
    { ...base, word: 'a', ipa: 'ˈeɪ', rank: 0, freq: 21000.5 },
    { ...base, word: 'a', ipa: 'ə', rank: 1 },
    { ...base, word: 'Worcester', ipa: 'ˈwʊstɚ', kind: 'proper' },
  ];

  it('faz ida e volta sem perda', () => {
    const text = serializeTsv('en-US', 'cmudict', entries);
    const parsed = parseTsv(text);
    expect(parsed.lang).toBe('en-US');
    expect(parsed.source).toBe('cmudict');
    expect(parsed.issues).toEqual([]);
    expect(parsed.entries).toEqual(entries);
  });

  it('recusa serializar entrada de outro idioma ou fonte', () => {
    expect(() => serializeTsv('en-GB', 'cmudict', entries)).toThrow(/en-US/);
  });

  it('descarta linhas inválidas e informa o número da linha', () => {
    const text = [
      FORMAT_HEADER,
      '#lang en-US',
      '#source cmudict',
      'word\tipa\trank\tfreq\tkind',
      'ok\tok\t0\t\t',
      'ruim\t/x/\t0\t\t',
      'curta\tx',
    ].join('\n');
    const parsed = parseTsv(text);
    expect(parsed.entries.map((e) => e.word)).toEqual(['ok']);
    expect(parsed.issues.map((i) => i.line)).toEqual([6, 7]);
  });

  it('rejeita cabeçalho, idioma ou fonte inválidos', () => {
    expect(() => parseTsv('word\tipa')).toThrow(/Cabeçalho/);
    expect(() => parseTsv([FORMAT_HEADER, '#lang xx', '#source cmudict'].join('\n'))).toThrow(/Idioma/);
    expect(() => parseTsv([FORMAT_HEADER, '#lang en-US', '#source foo'].join('\n'))).toThrow(/Fonte/);
  });
});
