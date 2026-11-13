/**
 * Interfaces dos estágios do motor. Cada tarefa da Fase 3 entrega uma implementação; o orquestrador (`convert`)
 * não muda.
 *
 *   texto ─ Tokenizer (T3.2) ─▶ trechos ─ Dictionary (T2.7/T3.1) ─▶ IPA ─ Phonology (T3.3–T3.6) ─▶ sílabas PT-BR
 *                                          └─ Estimator (T3.9, T5.x) quando a palavra não está no dicionário
 */
import type { Lang, Pronunciation, SourceId, StressSource } from './types';

/** Palavra a converter. */
export interface WordRaw {
  kind: 'word';
  /** Texto exatamente como digitado. */
  text: string;
  /** Forma de busca: NFC, apóstrofos (’ → ') e hífens tipográficos unificados. */
  norm: string;
  /** Começa com maiúscula (indício de nome próprio no modo texto misto). */
  capitalized: boolean;
  /** Primeira palavra do texto ou da frase (maiúscula aí não indica nome). */
  sentenceStart: boolean;
  /** Divisão de reserva, usada só se a palavra inteira não estiver no dicionário (l'école → l' + école). */
  parts?: RawToken[];
}

/** Trecho do texto: palavra a converter ou texto que passa direto. */
export type RawToken =
  WordRaw | { kind: 'text'; text: string; reason: 'space' | 'punctuation' | 'number' | 'portuguese' };

export interface Tokenizer {
  tokenize(text: string, lang: Lang): RawToken[];
}

/** Léxico do português (modo texto misto). Chaves: lookupKey (NFC, minúsculas). */
export interface PortugueseLexicon {
  /** Palavra comum do português. */
  has(key: string): boolean;
  /** Nome próprio do português (Londres, Alemanha, Munique). */
  isName(key: string): boolean;
}

/** Uma pronúncia como vem do dicionário (shard), antes da fonologia. */
export interface DictPronunciation {
  ipa: string;
  /** Tônica no dado: `dictionary` (marcada ou monossílaba), `borrowed`, ou `none` (precisa de regra). */
  stress: Exclude<StressSource, 'rule'>;
  source: SourceId;
  agree: number;
}

export interface DictEntry {
  /** Grafia de exibição (ex.: "Greenwich"). */
  display: string;
  proper: boolean;
  /** Em ordem de preferência; nunca vazio. */
  prons: DictPronunciation[];
}

export interface Dictionary {
  /** `key` já é a `lookupKey`. Resolve `undefined` se a palavra não existe. */
  lookup(lang: Lang, key: string): Promise<DictEntry | undefined>;
}

/** Estima o IPA de uma palavra fora do dicionário (G2P). `undefined` = não sabe estimar. */
export interface Estimator {
  /** `key` é a chave de busca (NFC, minúsculas do idioma): a estimativa pela grafia não depende de caixa. */
  estimate(key: string, lang: Lang): string | undefined;
}

/** IPA → sílabas PT-BR com tônica, destaques e armadilhas (notação inteira). */
export interface Phonology {
  /** `word` = grafia original (a regra de tônica do espanhol usa o acento gráfico). */
  render(ipa: string, lang: Lang, stress: Exclude<StressSource, 'rule'>, word?: string): Pronunciation;
}
