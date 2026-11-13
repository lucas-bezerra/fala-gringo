import { describe, expect, it } from 'vitest';
import type { MergedEntry } from '../../data/src/merge';
import { buildShards, dataVersionOf } from '../../data/src/shardBuilder';
import { SHARD_FORMAT, SOURCE_ORDER, type Manifest, type ShardFile } from '../../data/src/shards';
import { createEngine, placeholderPhonology } from './engine';
import { ShardDictionary } from './shardDictionary';
import type { Estimator, Phonology } from './stages';

// Shards reais (gerador da T2.7) com limite pequeno, para ter várias faixas.
const merged: MergedEntry[] = [
  ['water', 'ˈwɔtɚ', 'marked'],
  ['please', 'ˈpliz', 'marked'],
  ['thank', 'ˈθæŋk', 'marked'],
  ['you', 'ˈju', 'marked'],
  ['a', 'ə', 'mono'],
  ['a', 'ˈeɪ', 'marked'],
].map(([word, ipa, stress], i, all) => ({
  word,
  ipa,
  lang: 'en-US',
  rank: all.slice(0, i).filter((x) => x[0] === word).length,
  source: 'cmudict',
  stress: stress as MergedEntry['stress'],
  kind: 'common',
  agree: [],
}));
merged.push({
  ...merged[0],
  word: 'Greenwich',
  ipa: 'ˈɡɹɛnɪtʃ',
  kind: 'proper',
  source: 'wikidata',
  agree: ['cmudict'],
});
for (let i = 0; i < 400; i++)
  merged.push({ ...merged[1], word: `filler${String(i).padStart(3, '0')}`, ipa: 'ˈfɪlɚ' });

const built = buildShards('en-US', merged, 1024);
const files = new Map(built.shards.map((s) => [s.ref.file, JSON.parse(s.content) as ShardFile]));
const manifest: Manifest = {
  format: SHARD_FORMAT,
  dataVersion: dataVersionOf([...files.keys()]),
  sources: SOURCE_ORDER,
  langs: { 'en-US': { words: built.words, prons: built.prons, shards: built.shards.map((s) => s.ref) } },
};

function makeDictionary(cacheSize?: number) {
  const loads: string[] = [];
  const dict = new ShardDictionary({
    manifest,
    cacheSize,
    loadShard: async (file) => {
      loads.push(file);
      await new Promise((r) => setTimeout(r, 1));
      return files.get(file)!;
    },
  });
  return { dict, loads };
}

describe('ShardDictionary', () => {
  it('acha palavras, traduz a tônica e a fonte, e preserva a grafia de exibição', async () => {
    const { dict } = makeDictionary();
    expect(built.shards.length).toBeGreaterThan(2);
    expect(await dict.lookup('en-US', 'a')).toEqual({
      display: 'a',
      proper: false,
      prons: [
        { ipa: 'ə', stress: 'dictionary', source: 'cmudict', agree: 0 },
        { ipa: 'ˈeɪ', stress: 'dictionary', source: 'cmudict', agree: 0 },
      ],
    });
    expect(await dict.lookup('en-US', 'greenwich')).toMatchObject({ display: 'Greenwich', proper: true });
    expect(await dict.lookup('en-US', 'inexistente')).toBeUndefined();
    expect(await dict.lookup('fr-FR', 'bonjour')).toBeUndefined(); // idioma sem shards
    expect(dict.hasLanguage('en-US')).toBe(true);
    expect(dict.dataVersion).toBe(manifest.dataVersion);
  });

  it('junta pedidos simultâneos do mesmo shard e usa o cache', async () => {
    const { dict, loads } = makeDictionary();
    await Promise.all(['filler001', 'filler002', 'filler003'].map((k) => dict.lookup('en-US', k)));
    expect(loads).toHaveLength(1);
    await dict.lookup('en-US', 'filler004');
    expect(loads).toHaveLength(1);
  });

  it('descarta o shard menos usado quando o cache enche e tenta de novo após falha', async () => {
    const { dict, loads } = makeDictionary(1);
    await dict.lookup('en-US', 'a');
    await dict.lookup('en-US', 'you');
    await dict.lookup('en-US', 'a');
    expect(loads.length).toBe(3);

    let fail = true;
    const flaky = new ShardDictionary({
      manifest,
      loadShard: async (file) => {
        if (fail) throw new Error('rede');
        return files.get(file)!;
      },
    });
    await expect(flaky.lookup('en-US', 'you')).rejects.toThrow('rede');
    fail = false;
    expect(await flaky.lookup('en-US', 'you')).toBeDefined();
  });
});

describe('createEngine().convert', () => {
  // Fonologia de teste: separa sílabas por "." e marca armadilha se houver "ɚ".
  const fakePhonology: Phonology = {
    render(ipa, _lang, stress) {
      const parts = ipa.replace(/[ˈˌ]/g, '').split('.');
      return {
        ipa,
        syllables: parts.map((p, i) => ({
          text: i === 0 ? p.toUpperCase() : p,
          stressed: i === 0,
          segments: [],
        })),
        traps: ipa.includes('ɚ') ? ['CODA_R'] : [],
        stress,
      };
    },
  };
  const estimator: Estimator = { estimate: (w) => (w.startsWith('zorb') ? 'ˈzɔɹ.bəl' : undefined) };

  it('converte palavras do dicionário, estima as ausentes e mantém o resto do texto', async () => {
    const { dict } = makeDictionary();
    const engine = createEngine({ dictionary: dict, phonology: fakePhonology, estimator });
    const r = await engine.convert('Water, please! Zorble qwxyz 42', 'en-US');

    expect(
      r.tokens.map((t) => (t.kind === 'text' ? `${t.reason}:${t.text}` : `${t.kind}:${t.original}`)),
    ).toEqual([
      'word:Water',
      'punctuation:,',
      'space: ',
      'word:please',
      'punctuation:!',
      'space: ',
      'word:Zorble',
      'space: ',
      'unknown:qwxyz',
      'space: ',
      'number:42',
    ]);
    const [water, , , , , , zorble] = r.tokens;
    expect(water).toMatchObject({ origin: 'dictionary', source: 'cmudict', key: 'water', proper: false });
    expect(zorble).toMatchObject({ origin: 'estimated', agree: 0 });
    expect(r.reading).toEqual({
      syllabic: 'WƆTɚ, PLIZ! ZƆɹ·bəl qwxyz 42',
      flat: 'WƆTɚ, PLIZ! ZƆɹbəl qwxyz 42',
    });
    expect(r.traps).toEqual(['CODA_R']);
  });

  it('expõe as variantes e os nomes próprios', async () => {
    const { dict } = makeDictionary();
    const r = await createEngine({ dictionary: dict, phonology: placeholderPhonology }).convert(
      'a Greenwich',
      'en-US',
    );
    const [a, , g] = r.tokens;
    expect(a.kind === 'word' && a.variants.map((v) => v.ipa)).toEqual(['ˈeɪ']);
    expect(g).toMatchObject({ kind: 'word', proper: true, source: 'wikidata', agree: 1 });
  });

  it('rejeita texto acima do limite', async () => {
    const { dict } = makeDictionary();
    const engine = createEngine({ dictionary: dict, phonology: placeholderPhonology });
    await expect(engine.convert('a'.repeat(2001), 'en-US')).rejects.toThrow(RangeError);
    await expect(engine.convert('abc', 'en-US', { maxLength: 2 })).rejects.toThrow(/limite é 2/);
  });
});
