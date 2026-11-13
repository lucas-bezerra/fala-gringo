/**
 * Dicionário sobre os shards gerados pela T2.7 (formato em packages/data/SHARDS.md).
 * O carregamento é injetado (fetch no navegador/Worker, arquivo nos testes). Mantém um cache LRU de shards e
 * junta pedidos simultâneos do mesmo shard: uma frase com várias palavras na mesma faixa baixa o arquivo uma vez.
 */
import { SOURCE_ORDER, findShard, type Manifest, type ShardFile } from '@falagringo/data/shards';
import type { DictEntry, DictPronunciation, Dictionary } from './stages';
import type { Lang } from './types';

export interface ShardDictionaryOptions {
  manifest: Manifest;
  /** Carrega um shard pelo caminho do manifest (ex.: "en-US/ab12….json"). */
  loadShard: (file: string) => Promise<ShardFile>;
  /** Quantos shards manter em memória (padrão 8, ~1,5 MB comprimidos no pior caso). */
  cacheSize?: number;
}

const STRESS: Record<string, DictPronunciation['stress']> = {
  m: 'dictionary',
  o: 'dictionary',
  b: 'borrowed',
  n: 'none',
};

export class ShardDictionary implements Dictionary {
  private readonly cache = new Map<string, ShardFile>(); // ordem de inserção = ordem de uso (LRU)
  private readonly pending = new Map<string, Promise<ShardFile>>();
  private readonly cacheSize: number;

  constructor(private readonly options: ShardDictionaryOptions) {
    this.cacheSize = options.cacheSize ?? 8;
  }

  /** Versão dos dados (muda quando qualquer shard muda) — útil como chave de cache persistente. */
  get dataVersion(): string {
    return this.options.manifest.dataVersion;
  }

  hasLanguage(lang: Lang): boolean {
    return (this.options.manifest.langs[lang]?.shards.length ?? 0) > 0;
  }

  async lookup(lang: Lang, key: string): Promise<DictEntry | undefined> {
    const shards = this.options.manifest.langs[lang]?.shards;
    if (!shards?.length) return undefined;
    const ref = shards[findShard(shards, key)];
    const shard = await this.load(ref.file);
    const word = shard.words[key];
    if (!word) return undefined;
    return {
      display: word.w ?? key,
      proper: word.p === 1,
      prons: word.v.map(([ipa, stress, source, agree]) => ({
        ipa,
        stress: STRESS[stress] ?? 'none',
        source: SOURCE_ORDER[source],
        agree,
      })),
    };
  }

  private async load(file: string): Promise<ShardFile> {
    const cached = this.cache.get(file);
    if (cached) {
      this.cache.delete(file); // renova a posição no LRU
      this.cache.set(file, cached);
      return cached;
    }
    const inFlight = this.pending.get(file);
    if (inFlight) return inFlight;

    const promise = this.options.loadShard(file).then(
      (shard) => {
        this.pending.delete(file);
        this.cache.set(file, shard);
        while (this.cache.size > this.cacheSize) this.cache.delete(this.cache.keys().next().value!);
        return shard;
      },
      (error: unknown) => {
        this.pending.delete(file); // falha não fica em cache: a próxima busca tenta de novo
        throw error;
      },
    );
    this.pending.set(file, promise);
    return promise;
  }
}
