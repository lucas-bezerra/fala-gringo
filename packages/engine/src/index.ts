// Motor fonético do FalaGringo v2. Contrato: docs/notacao.md (seção 10); API: createEngine().convert().
export * from './types';
export type {
  DictEntry,
  DictPronunciation,
  Dictionary,
  Estimator,
  Phonology,
  RawToken,
  Tokenizer,
} from './stages';
export { DEFAULT_MAX_LENGTH, basicTokenizer, createEngine, placeholderPhonology } from './engine';
export type { Engine, EngineStages } from './engine';
export { ShardDictionary } from './shardDictionary';
export type { ShardDictionaryOptions } from './shardDictionary';
