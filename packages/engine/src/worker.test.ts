import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LruCache, cachedDictionary } from './cache';
import { createEngine, placeholderPhonology } from './engine';
import type { DictEntry, Dictionary } from './stages';
import { EngineClient } from './worker/client';
import type { MessagePortLike } from './worker/protocol';
import { serveEngine } from './worker/serve';

const entry = (ipa: string): DictEntry => ({
  display: 'x',
  proper: false,
  prons: [{ ipa, stress: 'dictionary', source: 'ipa-dict', agree: 1 }],
});

describe('LruCache', () => {
  it('descarta o usado há mais tempo', () => {
    const c = new LruCache<string, number>(2);
    c.set('a', 1);
    c.set('b', 2);
    c.get('a'); // "a" fica mais recente
    c.set('c', 3);
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
    expect(c.size).toBe(2);
  });

  it('rejeita capacidade < 1', () => {
    expect(() => new LruCache(0)).toThrow(RangeError);
  });
});

describe('cachedDictionary', () => {
  it('busca cada palavra uma vez, inclusive "não encontrada" e pedidos simultâneos', async () => {
    const lookup = vi.fn(async (_lang: string, key: string) => (key === 'think' ? entry('θɪŋk') : undefined));
    const dict = cachedDictionary({ lookup } as Dictionary);
    await Promise.all([dict.lookup('en-US', 'think'), dict.lookup('en-US', 'think')]);
    await dict.lookup('en-US', 'zzz');
    await dict.lookup('en-US', 'zzz');
    expect(lookup).toHaveBeenCalledTimes(2);
    // idiomas diferentes não se misturam
    await dict.lookup('en-GB', 'think');
    expect(lookup).toHaveBeenCalledTimes(3);
  });

  it('não guarda falhas', async () => {
    let fail = true;
    const lookup = vi.fn(async () => {
      if (fail) throw new Error('rede');
      return entry('θɪŋk');
    });
    const dict = cachedDictionary({ lookup });
    await expect(dict.lookup('en-US', 'think')).rejects.toThrow('rede');
    fail = false;
    await expect(dict.lookup('en-US', 'think')).resolves.toBeDefined();
    expect(lookup).toHaveBeenCalledTimes(2);
  });
});

describe('worker (serveEngine + EngineClient)', () => {
  const channels: MessageChannel[] = [];
  afterEach(() => {
    for (const ch of channels.splice(0)) {
      ch.port1.close();
      ch.port2.close();
    }
  });

  function connect(getEngine: Parameters<typeof serveEngine>[1]) {
    const ch = new MessageChannel();
    channels.push(ch);
    serveEngine(ch.port2 as unknown as MessagePortLike, getEngine);
    return new EngineClient(ch.port1 as unknown as MessagePortLike);
  }

  const dictionary: Dictionary = { lookup: async (_l, k) => (k === 'think' ? entry('θɪŋk') : undefined) };
  const makeEngine = async () => createEngine({ dictionary, phonology: placeholderPhonology });

  it('converte pela porta e cria o motor uma vez só', async () => {
    const getEngine = vi.fn(makeEngine);
    const client = connect(getEngine);
    expect(await client.ping()).toBe(true);
    const [a, b] = await Promise.all([
      client.convert('think', 'en-US'),
      client.convert('think think', 'en-US'),
    ]);
    expect(a.tokens[0]).toMatchObject({ kind: 'word' });
    expect(b.tokens.filter((t) => t.kind === 'word')).toHaveLength(2);
    expect(getEngine).toHaveBeenCalledTimes(1);
    expect(client.inFlight).toBe(0);
  });

  it('repassa o erro com o nome original (ex.: RangeError do limite)', async () => {
    const client = connect(makeEngine);
    const err = await client.convert('a'.repeat(30), 'en-US', { maxLength: 10 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).name).toBe('RangeError');
  });

  it('tenta criar o motor de novo depois de uma falha', async () => {
    let calls = 0;
    const client = connect(async () => {
      if (calls++ === 0) throw new Error('manifest indisponível');
      return makeEngine();
    });
    await expect(client.convert('think', 'en-US')).rejects.toThrow('manifest indisponível');
    await expect(client.convert('think', 'en-US')).resolves.toBeDefined();
  });

  it('convertLatest: só o pedido mais novo resolve com resultado', async () => {
    const client = connect(makeEngine);
    const [old, latest] = await Promise.all([
      client.convertLatest('thin', 'en-US'),
      client.convertLatest('think', 'en-US'),
    ]);
    expect(old).toBeUndefined();
    expect(latest?.tokens[0]).toMatchObject({ kind: 'word' });
  });
});
