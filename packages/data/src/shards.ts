/**
 * Shards do dicionário (T2.7) — formato consumido pelo app.
 *
 * Cada idioma é dividido em FAIXAS CONTÍGUAS de chaves de busca, em ordem (não por prefixo: em japonês e coreano
 * cada caractere seria um prefixo e geraria milhares de arquivos minúsculos). O manifest guarda a primeira chave
 * de cada shard; o app acha o shard de uma palavra com busca binária (`findShard`) e baixa só ele.
 *
 * ORDEM: comparação de strings do JavaScript (`<`, unidades UTF-16) sobre `lookupKey()`. Quem consulta precisa
 * usar a mesma chave e a mesma comparação.
 */
import type { MergedEntry, StressStatus } from './merge';
import type { Lang } from './schema';
import { SOURCES, type SourceId } from './sources';

export const SHARD_FORMAT = 1;

/** Status de tônica em uma letra: m(arked), b(orrowed), o (mono), n(one). */
export const STRESS_CODE: Record<StressStatus, string> = { marked: 'm', borrowed: 'b', mono: 'o', none: 'n' };

/** Ordem fixa das fontes; os shards guardam o índice (economiza bytes). */
export const SOURCE_ORDER = Object.keys(SOURCES) as SourceId[];

/** Pronúncia no shard: [ipa, tônica, índice da fonte, nº de fontes que concordam]. */
export type ShardPron = [ipa: string, stress: string, source: number, agree: number];

/** Palavra no shard. `w` só aparece se a grafia de exibição difere da chave; `p: 1` = nome próprio. */
export interface ShardWord {
  w?: string;
  p?: 1;
  v: ShardPron[];
}

export interface ShardFile {
  format: typeof SHARD_FORMAT;
  lang: Lang;
  /** chave de busca → palavra */
  words: Record<string, ShardWord>;
}

export interface ShardRef {
  /** Primeira chave do shard (inclusive). A última vai até a primeira do próximo (exclusive). */
  from: string;
  file: string;
  words: number;
  /** Tamanho em bytes, sem compressão e com gzip. */
  bytes: number;
  gzip: number;
}

export interface Manifest {
  format: typeof SHARD_FORMAT;
  /** Hash do conjunto de shards: muda se qualquer dado mudar. Serve de versão do cache no app. */
  dataVersion: string;
  sources: SourceId[];
  langs: Partial<Record<Lang, { words: number; prons: number; shards: ShardRef[] }>>;
  /** Léxicos auxiliares. `pt-BR`: palavras do português para o modo texto misto (uma palavra por linha). */
  lexicons?: { 'pt-BR'?: Omit<ShardRef, 'from'> };
}

/** Converte as pronúncias mescladas de UMA palavra em `ShardWord`. */
export function toShardWord(key: string, prons: readonly MergedEntry[]): ShardWord {
  // Desempate por IPA e grafia: a saída não pode depender da ordem de entrada (shards com hash determinístico).
  const sorted = [...prons].sort(
    (a, b) => a.rank - b.rank || (a.ipa < b.ipa ? -1 : a.ipa > b.ipa ? 1 : 0) || (a.word < b.word ? -1 : 1),
  );
  const first = sorted[0];
  const word: ShardWord = {
    v: sorted.map((e) => [e.ipa, STRESS_CODE[e.stress], SOURCE_ORDER.indexOf(e.source), e.agree.length]),
  };
  if (first.word !== key) word.w = first.word;
  if (first.kind === 'proper') word.p = 1;
  return word;
}

/** Índice do shard que contém `key` (ou que conteria, se a palavra existisse). -1 se o idioma não tem shards. */
export function findShard(shards: readonly Pick<ShardRef, 'from'>[], key: string): number {
  let lo = 0;
  let hi = shards.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (shards[mid].from <= key) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found === -1 && shards.length ? 0 : found;
}
