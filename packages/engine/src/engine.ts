/**
 * API pública do motor (T3.1): `createEngine(estágios).convert(texto, idioma)`.
 * O orquestrador só conecta os estágios (stages.ts); cada tarefa da Fase 3 troca um estágio sem mudar a API.
 */
import { lookupKey } from '@falagringo/data/schema';
import type { DictEntry, Dictionary, Estimator, Phonology, RawToken, Tokenizer } from './stages';
import type {
  ConversionResult,
  ConvertOptions,
  Lang,
  Pronunciation,
  Token,
  TrapId,
  WordToken,
} from './types';

export const DEFAULT_MAX_LENGTH = 2000;

export interface EngineStages {
  dictionary: Dictionary;
  phonology: Phonology;
  /** Padrão: `basicTokenizer` (provisório até a T3.2). */
  tokenizer?: Tokenizer;
  /** Sem estimador, palavras fora do dicionário viram `unknown` (T3.9 e T5.x trazem os estimadores). */
  estimator?: Estimator;
}

export interface Engine {
  convert(text: string, lang: Lang, options?: ConvertOptions): Promise<ConversionResult>;
}

/**
 * Tokenizador PROVISÓRIO (substituído na T3.2): `Intl.Segmenter` por palavra. Ainda não reconhece números
 * por extenso, hífens nem trechos em português.
 */
export const basicTokenizer: Tokenizer = {
  tokenize(text, lang) {
    const segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
    return [...segmenter.segment(text)].map((s): RawToken => {
      if (s.isWordLike)
        return /^\p{N}+$/u.test(s.segment)
          ? { kind: 'text', text: s.segment, reason: 'number' }
          : { kind: 'word', text: s.segment };
      return { kind: 'text', text: s.segment, reason: /^\s+$/u.test(s.segment) ? 'space' : 'punctuation' };
    });
  },
};

/**
 * Fonologia PROVISÓRIA (substituída pela T3.3–T3.6): devolve o IPA como uma sílaba só, sem conversão para PT-BR.
 * Existe para o pipeline funcionar de ponta a ponta enquanto a fonologia real não fica pronta.
 */
export const placeholderPhonology: Phonology = {
  render(ipa, _lang, stress) {
    return {
      ipa,
      syllables: [{ text: ipa, stressed: false, segments: [{ text: ipa, ipa, special: false }] }],
      traps: [],
      stress,
    };
  },
};

const sylText = (p: Pronunciation, sep: string) => p.syllables.map((s) => s.text).join(sep);

export function createEngine(stages: EngineStages): Engine {
  const tokenizer = stages.tokenizer ?? basicTokenizer;

  async function toToken(raw: RawToken, lang: Lang, entry: DictEntry | undefined): Promise<Token> {
    if (raw.kind === 'text') return raw;
    const key = lookupKey(raw.text, lang);
    if (entry) {
      const [first, ...rest] = entry.prons;
      const token: WordToken = {
        kind: 'word',
        original: raw.text,
        key,
        origin: 'dictionary',
        source: first.source,
        proper: entry.proper,
        agree: first.agree,
        primary: stages.phonology.render(first.ipa, lang, first.stress),
        variants: rest.map((p) => stages.phonology.render(p.ipa, lang, p.stress)),
      };
      return token;
    }
    const estimated = stages.estimator?.estimate(key, lang);
    if (estimated) {
      return {
        kind: 'word',
        original: raw.text,
        key,
        origin: 'estimated',
        proper: false,
        agree: 0,
        primary: stages.phonology.render(estimated, lang, 'none'),
        variants: [],
      };
    }
    return { kind: 'unknown', original: raw.text, key };
  }

  return {
    async convert(text, lang, options = {}) {
      const max = options.maxLength ?? DEFAULT_MAX_LENGTH;
      if (text.length > max) throw new RangeError(`Texto com ${text.length} caracteres; o limite é ${max}.`);

      const raws = tokenizer.tokenize(text.normalize('NFC'), lang);
      // Buscas em paralelo; o dicionário junta pedidos do mesmo shard.
      const entries = await Promise.all(
        raws.map((r) =>
          r.kind === 'word' ? stages.dictionary.lookup(lang, lookupKey(r.text, lang)) : undefined,
        ),
      );
      const tokens = await Promise.all(raws.map((r, i) => toToken(r, lang, entries[i])));

      const traps: TrapId[] = [];
      let syllabic = '';
      let flat = '';
      for (const t of tokens) {
        if (t.kind === 'word') {
          syllabic += sylText(t.primary, '·');
          flat += sylText(t.primary, '');
          for (const trap of t.primary.traps) if (!traps.includes(trap)) traps.push(trap);
        } else {
          const plain = t.kind === 'text' ? t.text : t.original;
          syllabic += plain;
          flat += plain;
        }
      }
      return { lang, tokens, reading: { syllabic, flat }, traps };
    },
  };
}
