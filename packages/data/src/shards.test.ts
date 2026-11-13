import { gunzipSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { MergedEntry } from './merge';
import { lookupKey } from './schema';
import { buildShards, dataVersionOf } from './shardBuilder';
import { SOURCE_ORDER, findShard, toShardWord, type ShardFile } from './shards';

const m = (word: string, ipa: string, rank = 0, extra: Partial<MergedEntry> = {}): MergedEntry => ({
  word,
  ipa,
  lang: 'en-US',
  rank,
  source: 'cmudict',
  stress: 'marked',
  kind: 'common',
  agree: [],
  ...extra,
});

describe('toShardWord', () => {
  it('compacta pronúncias em ordem de rank, com grafia e nome próprio só quando necessário', () => {
    expect(toShardWord('a', [m('a', 'ˈeɪ', 1), m('a', 'ə', 0, { stress: 'mono' })])).toEqual({
      v: [
        ['ə', 'o', SOURCE_ORDER.indexOf('cmudict'), 0],
        ['ˈeɪ', 'm', SOURCE_ORDER.indexOf('cmudict'), 0],
      ],
    });
    expect(
      toShardWord('greenwich', [
        m('Greenwich', 'ˈɡɹɛnɪtʃ', 0, { kind: 'proper', source: 'wikidata', agree: ['cmudict'] }),
      ]),
    ).toEqual({ w: 'Greenwich', p: 1, v: [['ˈɡɹɛnɪtʃ', 'm', SOURCE_ORDER.indexOf('wikidata'), 1]] });
  });
});

describe('findShard', () => {
  const shards = [{ from: '' }, { from: 'f' }, { from: 'm' }, { from: 'tomato' }];
  it.each([
    ['apple', 0],
    ['f', 1],
    ['fz', 1],
    ['m', 2],
    ['tomat', 2],
    ['tomato', 3],
    ['zebra', 3],
  ])('%s → shard %i', (key, idx) => {
    expect(findShard(shards, key)).toBe(idx);
  });
  it('sem shards → -1', () => {
    expect(findShard([], 'a')).toBe(-1);
  });
});

describe('buildShards', () => {
  // ~3.000 palavras pseudoaleatórias, com variantes, para forçar vários shards com limite pequeno.
  const words: MergedEntry[] = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < 3000; i++) {
    const w = Array.from({ length: 4 + Math.floor(rnd() * 8) }, () => letters[Math.floor(rnd() * 26)]).join(
      '',
    );
    words.push(m(i % 50 === 0 ? w.toUpperCase() : w, 'ˈ' + w.replace(/[aeiou]/g, 'ə'), 0));
    if (i % 7 === 0) words.push(m(w, w, 1, { stress: 'none' }));
  }
  const LIMIT = 8 * 1024;
  const { shards, words: count } = buildShards('en-US', words, LIMIT);

  it('respeita o limite comprimido e gera vários shards', () => {
    expect(shards.length).toBeGreaterThan(3);
    for (const s of shards) {
      expect(s.ref.gzip).toBeLessThanOrEqual(LIMIT);
      expect(gzipSync(Buffer.from(s.content)).length).toBeLessThanOrEqual(LIMIT + 64);
    }
  });

  it('cada palavra está em exatamente um shard, e é o que findShard aponta', () => {
    const files = shards.map((s) => JSON.parse(s.content) as ShardFile);
    expect(files.reduce((n, f) => n + Object.keys(f.words).length, 0)).toBe(count);
    for (const e of words) {
      const key = lookupKey(e.word, 'en-US');
      const idx = findShard(
        shards.map((s) => s.ref),
        key,
      );
      expect(files[idx].words[key], key).toBeDefined();
    }
  });

  it('faixas em ordem e o primeiro shard começa na chave vazia', () => {
    expect(shards[0].ref.from).toBe('');
    for (let i = 2; i < shards.length; i++) expect(shards[i - 1].ref.from < shards[i].ref.from).toBe(true);
  });

  it('é determinístico e o nome do arquivo segue o conteúdo', () => {
    const again = buildShards('en-US', [...words].reverse(), LIMIT).shards;
    expect(again.map((s) => s.ref.file)).toEqual(shards.map((s) => s.ref.file));
    expect(dataVersionOf(again.map((s) => s.ref.file))).toBe(dataVersionOf(shards.map((s) => s.ref.file)));
    expect(new Set(shards.map((s) => s.ref.file)).size).toBe(shards.length);
    expect(gunzipSync(gzipSync(Buffer.from(shards[0].content))).toString()).toBe(shards[0].content);
  });
});
