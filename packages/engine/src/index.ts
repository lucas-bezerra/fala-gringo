// Motor fonético do FalaGringo v2. Contrato: docs/notacao.md (seção 10); API: createEngine().convert().
export * from './types';
export type {
  DictEntry,
  DictPronunciation,
  Dictionary,
  Estimator,
  Phonology,
  PortugueseLexicon,
  RawToken,
  Tokenizer,
  WordRaw,
} from './stages';
export { DEFAULT_MAX_LENGTH, createEngine, placeholderPhonology } from './engine';
export { createTokenizer, normalizeForLookup, parsePtLexicon } from './tokenizer';
export { FUNCTION_WORDS } from './functionWords';
export type { Engine, EngineStages } from './engine';
export { ShardDictionary } from './shardDictionary';
export type { ShardDictionaryOptions } from './shardDictionary';
export { parseIpa, phonesOf, serializeIpa } from './ipa/parse';
export type { IpaToken, Phone } from './ipa/parse';
export { NO_STRESS, legalOnset, spanishStressFromEnd, syllabify } from './ipa/syllabify';
export type { IpaSyllable, SyllabifiedWord, SyllabifyOptions, SyllabifyResult } from './ipa/syllabify';
export { createPhonology, renderPronunciation } from './phonology';
export type { RenderDiagnostics } from './phonology';
export { CORE_ORTHOGRAPHY, CORE_RULES, CORE_TRAPS } from './rules/core';
export { PROFILES } from './rules/profiles';
export { applyRules, ruleSetFor } from './rules/apply';
export type { Context, MapRule, Matcher, OrthoRule, Profile, TrapRule } from './rules/dsl';
export { LruCache, cachedDictionary } from './cache';
export { EngineClient } from './worker/client';
export { serveEngine } from './worker/serve';
export type { EngineRequest, EngineRequestBody, EngineResponse, MessagePortLike } from './worker/protocol';
