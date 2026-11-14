/**
 * Motor fonético num Web Worker (T3.10/T4.2): a conversão nunca trava a tela.
 * Os dados vêm de /dict/ (publicados por packages/data/scripts/sync-web.mjs): manifest + shards por idioma.
 * O léxico do português (texto misto, modo apresentador) só é baixado no primeiro pedido com `mixed`.
 * Modelo G2P (T3.9, experimental): só existe se o manifest o anuncia (`pnpm dev:g2p`); é baixado na primeira
 * palavra fora do dicionário daquele idioma.
 */
import type { Manifest, ShardFile } from '@falagringo/data/shards';
import {
  cachedDictionary,
  createEngine,
  createG2pEstimator,
  loadG2pModel,
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
  const estimator = manifest.g2p
    ? createG2pEstimator({
        load: async (lang) => {
          const ref = manifest.g2p?.[lang];
          if (!ref) return undefined;
          const [json, bin] = await Promise.all([
            get(ref.json).then((r) => r.json() as Promise<unknown>),
            get(ref.bin).then((r) => r.arrayBuffer()),
          ]);
          return loadG2pModel(json, bin);
        },
      })
    : undefined;
  const plain = createEngine({ dictionary, phonology, estimator });

  let mixed: Promise<Engine> | undefined;
  const mixedEngine = () =>
    (mixed ??= (async () => {
      const file = manifest.lexicons?.['pt-BR']?.file;
      if (!file) throw new Error('Os dados publicados não têm o léxico do português (texto misto).');
      const lex = parsePtLexicon(await (await get(file)).text());
      const portuguese = { has: (k: string) => lex.words.has(k), isName: (k: string) => lex.names.has(k) };
      return createEngine({ dictionary, phonology, portuguese, estimator });
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
