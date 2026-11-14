/**
 * Motor fonético num Web Worker (T3.10/T4.2): a conversão nunca trava a tela.
 * Os dados vêm de /dict/ (publicados por packages/data/scripts/sync-web.mjs): manifest + shards por idioma.
 */
import type { Manifest, ShardFile } from '@falagringo/data/shards';
import {
  cachedDictionary,
  createEngine,
  createPhonology,
  serveEngine,
  ShardDictionary,
  type MessagePortLike,
} from '@falagringo/engine';

const BASE = `${import.meta.env.BASE_URL}dict/`;

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(BASE + file);
  if (!res.ok) throw new Error(`Não foi possível baixar ${file} (HTTP ${res.status}).`);
  return (await res.json()) as T;
}

serveEngine(self as unknown as MessagePortLike, async () => {
  const manifest = await getJson<Manifest>('manifest.json');
  const dictionary = new ShardDictionary({ manifest, loadShard: (file) => getJson<ShardFile>(file) });
  // O léxico do português (texto misto) entra com o modo apresentador (T4.7).
  return createEngine({ dictionary: cachedDictionary(dictionary), phonology: createPhonology() });
});
