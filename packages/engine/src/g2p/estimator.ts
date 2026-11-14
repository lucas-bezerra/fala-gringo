/**
 * Estimador por modelo G2P (T3.9): pronúncia de palavras fora do dicionário, estimada pela grafia.
 *
 * O modelo de cada idioma só é carregado no primeiro pedido daquele idioma (carregamento injetado, como os shards).
 * Uma falha de carga não fica guardada: o pedido seguinte tenta de novo. As estimativas ficam num LRU por palavra.
 */
import { LruCache } from '../cache';
import type { Estimator } from '../stages';
import type { Lang } from '../types';
import type { G2pModel } from './model';

export interface G2pEstimatorOptions {
  /** Modelo do idioma, ou `undefined` se o idioma não tem modelo. */
  load(lang: Lang): Promise<G2pModel | undefined>;
  /** Estimativas guardadas (padrão: 2.000 palavras). */
  cacheSize?: number;
}

/**
 * Grafia de entrada do modelo: a chave de busca, com cada símbolo desconhecido trocado pela letra base
 * (`café` → `cafe` num modelo sem `é`). `undefined` se ainda sobrar símbolo desconhecido (outra escrita,
 * dígito) ou se a palavra for longa demais: aí o modelo só inventaria.
 */
export function modelInput(model: G2pModel, key: string): string | undefined {
  let out = '';
  for (const ch of key) {
    if (model.knows(ch)) {
      out += ch;
      continue;
    }
    const base = ch.normalize('NFD').replace(/\p{M}/gu, '');
    if (!base || ![...base].every((b) => model.knows(b))) return undefined;
    out += base;
  }
  if (!out || [...out].length > model.maxWordLength) return undefined;
  return out;
}

export function createG2pEstimator({ load, cacheSize = 2000 }: G2pEstimatorOptions): Estimator {
  const models = new Map<Lang, Promise<G2pModel | undefined>>();
  const cache = new LruCache<string, string | undefined>(cacheSize);

  const modelFor = (lang: Lang) => {
    let pending = models.get(lang);
    if (!pending) {
      pending = load(lang).catch((error: unknown) => {
        models.delete(lang); // tenta de novo no próximo pedido
        throw error;
      });
      models.set(lang, pending);
    }
    return pending;
  };

  return {
    async estimate(key, lang) {
      const id = `${lang}\u0000${key}`;
      if (cache.has(id)) return cache.get(id);
      const model = await modelFor(lang);
      const input = model && modelInput(model, key);
      const ipa = input ? model.predict(input) || undefined : undefined;
      cache.set(id, ipa);
      return ipa;
    },
  };
}
