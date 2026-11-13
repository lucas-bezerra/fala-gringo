/**
 * Gerador de shards (T2.7) — Node. Agrupa as pronúncias mescladas por chave, ordena e empacota faixas contíguas
 * de palavras em arquivos de até `maxGzipBytes` comprimidos. Nomes de arquivo levam o hash do conteúdo (cache
 * imutável). Mesma entrada → mesmos arquivos (determinístico).
 */
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import type { MergedEntry } from './merge';
import { lookupKey, type Lang } from './schema';
import { SHARD_FORMAT, toShardWord, type ShardFile, type ShardRef, type ShardWord } from './shards';

export const DEFAULT_MAX_GZIP = 200 * 1024;

export interface BuiltShard {
  ref: ShardRef;
  content: string;
}

const hash = (s: string, n = 12) => createHash('sha256').update(s).digest('hex').slice(0, n);
const gzipSize = (s: string) => gzipSync(Buffer.from(s), { level: 9 }).length;

function render(lang: Lang, items: readonly [string, ShardWord][]): string {
  const file: ShardFile = { format: SHARD_FORMAT, lang, words: Object.fromEntries(items) };
  return JSON.stringify(file);
}

export function buildShards(
  lang: Lang,
  merged: readonly MergedEntry[],
  maxGzipBytes = DEFAULT_MAX_GZIP,
): { shards: BuiltShard[]; words: number; prons: number } {
  const byKey = new Map<string, MergedEntry[]>();
  for (const e of merged) {
    const key = lookupKey(e.word, lang);
    const list = byKey.get(key);
    if (list) list.push(e);
    else byKey.set(key, [e]);
  }
  const items: [string, ShardWord][] = [...byKey.keys()]
    .sort()
    .map((k) => [k, toShardWord(k, byKey.get(k)!)]);

  const shards: BuiltShard[] = [];
  const emit = (chunk: [string, ShardWord][]) => {
    const content = render(lang, chunk);
    const gz = gzipSize(content);
    if (gz > maxGzipBytes && chunk.length > 1) {
      const mid = chunk.length >> 1;
      emit(chunk.slice(0, mid));
      emit(chunk.slice(mid));
      return;
    }
    if (gz > maxGzipBytes) throw new Error(`Palavra "${chunk[0][0]}" sozinha passa de ${maxGzipBytes} bytes`);
    shards.push({
      content,
      ref: {
        from: shards.length === 0 ? '' : chunk[0][0], // o 1º shard cobre tudo abaixo da 2ª fronteira
        file: `${lang}/${hash(content)}.json`,
        words: chunk.length,
        bytes: Buffer.byteLength(content),
        gzip: gz,
      },
    });
  };

  // Empacotamento guloso por tamanho bruto, com meta ajustada pela taxa de compressão observada.
  let rawTarget = maxGzipBytes * 4;
  let chunk: [string, ShardWord][] = [];
  let rawSize = 0;
  const flush = () => {
    if (!chunk.length) return;
    const before = shards.length;
    emit(chunk);
    const last = shards.slice(before);
    const ratio = last.reduce((s, x) => s + x.ref.bytes, 0) / last.reduce((s, x) => s + x.ref.gzip, 0);
    rawTarget = Math.floor(maxGzipBytes * ratio * 0.9); // 10% de folga para não estourar o limite
    chunk = [];
    rawSize = 0;
  };
  for (const item of items) {
    chunk.push(item);
    rawSize += Buffer.byteLength(JSON.stringify(item)) + 1;
    if (rawSize >= rawTarget) flush();
  }
  flush();

  return { shards, words: items.length, prons: merged.length };
}

/** Versão dos dados: hash dos nomes de todos os shards (que já carregam o hash do conteúdo). */
export function dataVersionOf(files: readonly string[]): string {
  return hash([...files].sort().join('\n'));
}
