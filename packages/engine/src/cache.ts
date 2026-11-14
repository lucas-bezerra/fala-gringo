/**
 * Cache LRU de palavras (T3.10). Frases repetidas e digitação incremental consultam as mesmas palavras de novo;
 * o cache evita refazer a busca (e junta pedidos simultâneos da mesma palavra).
 */
import type { DictEntry, Dictionary } from './stages';
import type { Lang } from './types';

/** Mapa com limite de tamanho; ao estourar, descarta o item usado há mais tempo. */
export class LruCache<K, V> {
  private readonly map = new Map<K, V>();

  constructor(readonly capacity: number) {
    if (capacity < 1) throw new RangeError('capacidade deve ser ≥ 1');
  }

  get size(): number {
    return this.map.size;
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key) as V;
    this.map.delete(key); // renova a posição
    this.map.set(key, value);
    return value;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  set(key: K, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value as K);
  }

  delete(key: K): void {
    this.map.delete(key);
  }
}

/**
 * Envolve um dicionário com cache LRU por (idioma, palavra), inclusive de "não encontrada".
 * Falhas (rede) não ficam no cache: a próxima busca tenta de novo.
 */
export function cachedDictionary(dictionary: Dictionary, capacity = 5000): Dictionary {
  const cache = new LruCache<string, Promise<DictEntry | undefined>>(capacity);
  return {
    lookup(lang: Lang, key: string) {
      const k = `${lang}\u0000${key}`;
      const hit = cache.get(k);
      if (hit) return hit;
      const promise = dictionary.lookup(lang, key);
      cache.set(k, promise);
      promise.catch(() => cache.delete(k));
      return promise;
    },
  };
}
