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
