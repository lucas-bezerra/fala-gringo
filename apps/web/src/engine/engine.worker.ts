/**
 * Motor fonético num Web Worker (T3.10/T4.2): a conversão nunca trava a tela.
 * Os dados vêm de /dict/ (publicados por packages/data/scripts/sync-web.mjs): manifest + shards por idioma.
 * O léxico do português (texto misto, modo apresentador) só é baixado no primeiro pedido com `mixed`.
 */
import type { Manifest, ShardFile } from '@falagringo/data/shards';
import {
  cachedDictionary,
  createEngine,
  createPhonology,
  parsePtLexicon,
  serveEngine,
  ShardDictionary,
  type Dictionary,
  type Engine,
  type MessagePortLike,
} from '@falagringo/engine';

const BASE = `${import.meta.env.BASE_URL}dict/`;

async function get(file: string): Promise<Response> {
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`Não foi possível baixar ${file} (HTTP ${res.status}).`);
  return res;
}

async function setup(): Promise<Engine> {
  const manifest = (await (await get('manifest.json')).json()) as Manifest;
  const dictionary: Dictionary = cachedDictionary(
    new ShardDictionary({
      manifest,
      loadShard: async (file) => (await (await get(file)).json()) as ShardFile,
    }),
  );
  const phonology = createPhonology();
  const plain = createEngine({ dictionary, phonology });

  let mixed: Promise<Engine> | undefined;
  const mixedEngine = () =>
    (mixed ??= (async () => {
      const file = manifest.lexicons?.['pt-BR']?.file;
      if (!file) throw new Error('Os dados publicados não têm o léxico do português (texto misto).');
      const lex = parsePtLexicon(await (await get(file)).text());
      const portuguese = { has: (k: string) => lex.words.has(k), isName: (k: string) => lex.names.has(k) };
      return createEngine({ dictionary, phonology, portuguese });
    })().catch((error: unknown) => {
      mixed = undefined; // tenta de novo no próximo pedido
      throw error;
    }));

  return {
    convert: async (text, lang, options) =>
      options?.mixed
        ? (await mixedEngine()).convert(text, lang, options)
        : plain.convert(text, lang, options),
  };
}

serveEngine(self as unknown as MessagePortLike, setup);
