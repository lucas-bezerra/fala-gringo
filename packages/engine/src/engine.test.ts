import { describe, expect, it } from 'vitest';
import type { MergedEntry } from '../../data/src/merge';
import { buildShards, dataVersionOf } from '../../data/src/shardBuilder';
import { SHARD_FORMAT, SOURCE_ORDER, type Manifest, type ShardFile } from '../../data/src/shards';
import { createEngine, placeholderPhonology } from './engine';
import { ShardDictionary } from './shardDictionary';
import type { Dictionary, Estimator, Phonology, PortugueseLexicon } from './stages';

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

describe('modo texto misto e partes de reserva (T3.2)', () => {
  const dict = (words: Record<string, string>): Dictionary => ({
    lookup: async (_lang, key) =>
      words[key]
        ? {
            display: key,
            proper: false,
            prons: [{ ipa: words[key], stress: 'dictionary', source: 'cmudict', agree: 0 }],
          }
        : undefined,
  });
  const lexicon = (words: string[], names: string[] = []): PortugueseLexicon => ({
    has: (k) => words.includes(k),
    isName: (k) => names.includes(k),
  });
  /** Palavras convertidas, na ordem (o resto do texto passa direto). */
  const foreign = (r: { tokens: { kind: string; original?: string }[] }) =>
    r.tokens.filter((t) => t.kind === 'word').map((t) => t.original);

  const EN = dict({
    worcester: 'ˈwʊstɚ', massachusetts: 'ˌmæsəˈtʃusəts', greenwich: 'ˈɡɹɛnɪtʃ', paris: 'ˈpɛɹɪs',
    e: 'ˈi', em: 'əm', o: 'ˈoʊ', a: 'ə', caso: 'ˈkeɪsoʊ',
    "l'": 'l', 'école': 'eˈkɔl', well: 'ˈwɛl', known: 'ˈnoʊn', 'well-known': 'ˈwɛlˈnoʊn', bout: 'ˈbaʊt',
  }); // prettier-ignore
  const PT = lexicon(
    ['correspondentes', 'em', 'e', 'acompanham', 'o', 'caso', 'aprovou', 'a', 'lei', 'disse', 'paris'],
    ['londres', 'massachusetts'],
  );

  it('converte só os nomes estrangeiros numa frase de apresentador', async () => {
    const engine = createEngine({ dictionary: EN, phonology: placeholderPhonology, portuguese: PT });
    const r = await engine.convert(
      'Correspondentes em Worcester, Massachusetts, e em Greenwich, em Londres, acompanham o caso.',
      'en-US',
      { mixed: true },
    );
    expect(foreign(r)).toEqual(['Worcester', 'Massachusetts', 'Greenwich']);
    expect(r.tokens.find((t) => t.kind === 'text' && t.text === 'Londres')).toMatchObject({
      reason: 'portuguese',
    });
  });

  it('nome estrangeiro no início da frase continua estrangeiro; palavra comum não', async () => {
    const engine = createEngine({ dictionary: EN, phonology: placeholderPhonology, portuguese: PT });
    expect(foreign(await engine.convert('Massachusetts aprovou a lei.', 'en-US', { mixed: true }))).toEqual([
      'Massachusetts',
    ]);
    expect(foreign(await engine.convert('Caso encerrado em Worcester.', 'en-US', { mixed: true }))).toEqual([
      'Worcester',
    ]);
  });

  it('atrai palavras funcionais do idioma-alvo para o nome ("Jerez de la Frontera"), mas não em "estado de Jalisco"', async () => {
    const ES = dict({
      real: 'reˈal',
      jerez: 'xeˈɾeθ',
      de: 'de',
      la: 'la',
      frontera: 'fɾonˈteɾa',
      jalisco: 'xaˈlisko',
      a: 'a',
      en: 'en',
    });
    const ptEs = lexicon(
      ['a', 'próxima', 'etapa', 'será', 'em', 'de', 'la', 'na', 'o', 'estado'],
      ['espanha'],
    );
    const engine = createEngine({ dictionary: ES, phonology: placeholderPhonology, portuguese: ptEs });
    const r1 = await engine.convert('A próxima etapa será em Jerez de la Frontera, na Espanha.', 'es-ES', {
      mixed: true,
    });
    expect(foreign(r1)).toEqual(['Jerez', 'de', 'la', 'Frontera']);
    const r2 = await engine.convert('o estado de Jalisco', 'es-ES', { mixed: true });
    expect(foreign(r2)).toEqual(['Jalisco']);
    // "de" entre dois estrangeiros vai junto mesmo sendo PT_CORE
    const r3 = await engine.convert('o Real de Jalisco', 'es-ES', { mixed: true });
    expect(foreign(r3)).toEqual(['Real', 'de', 'Jalisco']);
  });

  it('a correção manual vence a heurística', async () => {
    const engine = createEngine({ dictionary: EN, phonology: placeholderPhonology, portuguese: PT });
    const text = 'Correspondentes em Paris disse o caso';
    expect(foreign(await engine.convert(text, 'en-US', { mixed: true }))).toEqual(['Paris']);
    expect(
      foreign(
        await engine.convert(text, 'en-US', {
          mixed: { forcePortuguese: ['paris'], forceForeign: ['caso'] },
        }),
      ),
    ).toEqual(['caso']);
  });

  it('exige o léxico para o modo misto', async () => {
    const engine = createEngine({ dictionary: EN, phonology: placeholderPhonology });
    await expect(engine.convert('em Worcester', 'en-US', { mixed: true })).rejects.toThrow(/léxico/);
  });

  it('usa a palavra inteira quando existe e as partes de reserva quando não', async () => {
    const engine = createEngine({ dictionary: EN, phonology: placeholderPhonology });
    expect(foreign(await engine.convert('a well-known one', 'en-US'))).toEqual(['a', 'well-known']);
    const fr = await engine.convert('L’école', 'fr-FR');
    expect(foreign(fr)).toEqual(['L’', 'école']);
    expect(fr.reading.flat).toBe('leˈkɔl');
    const unknownBoth = await engine.convert('xx-yy', 'en-US');
    expect(unknownBoth.tokens).toEqual([{ kind: 'unknown', original: 'xx-yy', key: 'xx-yy' }]);
  });
});
