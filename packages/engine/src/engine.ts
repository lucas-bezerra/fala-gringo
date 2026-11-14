/**
 * API pública do motor (T3.1): `createEngine(estágios).convert(texto, idioma)`.
 * O orquestrador conecta os estágios (stages.ts) e decide, no modo texto misto (T3.2), o que é português.
 */
import { lookupKey } from '@falagringo/data/schema';
import { PT_CORE } from '@falagringo/data/ptLexicon';
import { FUNCTION_WORDS } from './functionWords';
import type {
  DictEntry,
  Dictionary,
  Estimator,
  Phonology,
  PortugueseLexicon,
  RawToken,
  Tokenizer,
  WordRaw,
} from './stages';
import { createPhonology } from './phonology';
import { createTokenizer } from './tokenizer';
import type { ConversionResult, ConvertOptions, Lang, Pronunciation, Token, TrapId } from './types';

export const DEFAULT_MAX_LENGTH = 2000;

export interface EngineStages {
  dictionary: Dictionary;
  /** Padrão: `createPhonology()` (parser → sílabas → regras). */
  phonology?: Phonology;
  /** Padrão: `createTokenizer()`. */
  tokenizer?: Tokenizer;
  /** Sem estimador, palavras fora do dicionário viram `unknown` (T3.9 e T5.x trazem os estimadores). */
  estimator?: Estimator;
  /** Léxico do português — obrigatório para o modo texto misto (`convert(..., { mixed })`). */
  portuguese?: PortugueseLexicon;
}

export interface Engine {
  convert(text: string, lang: Lang, options?: ConvertOptions): Promise<ConversionResult>;
}

/**
 * Fonologia de TESTE: devolve o IPA como uma sílaba só, sem conversão. Útil para testar o orquestrador isolado;
 * o padrão do motor é `createPhonology()`.
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

const PT_CORE_SET = new Set(PT_CORE);
/** Forma silabada (sep "·") ou corrida (sep ""); palavras de um nome composto separadas por espaço. */
const sylText = (p: Pronunciation, sep: string) =>
  p.syllables.map((s, i) => (i === 0 ? '' : s.wordStart ? ' ' : sep) + s.text).join('');

/** Todas as palavras (inclusive partes de reserva), para buscar no dicionário de uma vez. */
function collectWords(raws: readonly RawToken[], acc: WordRaw[] = []): WordRaw[] {
  for (const r of raws) {
    if (r.kind !== 'word') continue;
    acc.push(r);
    if (r.parts) collectWords(r.parts, acc);
  }
  return acc;
}

export function createEngine(stages: EngineStages): Engine {
  const tokenizer = stages.tokenizer ?? createTokenizer();
  const phonology = stages.phonology ?? createPhonology();

  return {
    async convert(text, lang, options = {}) {
      const max = options.maxLength ?? DEFAULT_MAX_LENGTH;
      if (text.length > max) throw new RangeError(`Texto com ${text.length} caracteres; o limite é ${max}.`);
      const mixed = options.mixed ? (options.mixed === true ? {} : options.mixed) : undefined;
      if (mixed && !stages.portuguese) throw new Error('O modo texto misto precisa do léxico do português.');

      const raws = tokenizer.tokenize(text.normalize('NFC'), lang);
      const keyOf = (w: WordRaw) => lookupKey(w.norm, lang);

      // Buscas em paralelo (o dicionário junta pedidos do mesmo shard).
      const keys = [...new Set(collectWords(raws).map(keyOf))];
      const found = new Map<string, DictEntry | undefined>();
      await Promise.all(keys.map(async (k) => found.set(k, await stages.dictionary.lookup(lang, k))));

      // Modo texto misto: decide palavra a palavra se é português (passa direto) ou estrangeira (converte).
      const portuguese = new Set<RawToken>();
      if (mixed) {
        const pt = stages.portuguese!;
        const forcePt = new Set(mixed.forcePortuguese ?? []);
        const forceForeign = new Set(mixed.forceForeign ?? []);
        for (const r of raws) {
          if (r.kind !== 'word') continue;
          const key = keyOf(r);
          if (forcePt.has(key)) portuguese.add(r);
          else if (forceForeign.has(key)) continue;
          else if (r.capitalized && !r.sentenceStart) {
            // Nome no meio da frase: estrangeiro se o dicionário do idioma-alvo o tem; senão, português se for
            // nome ou palavra do português. Preferimos converter um nome português por engano (Paris) a deixar
            // um estrangeiro sem leitura.
            if (!found.get(key) && (pt.isName(key) || pt.has(key))) portuguese.add(r);
          } else if (pt.has(key)) {
            portuguese.add(r); // palavra comum do português (inclusive no início da frase: "Correspondentes")
          } else if (found.get(key)) {
            continue; // estrangeira conhecida (inclusive nome no início da frase: "Massachusetts")
          } else if (pt.isName(key) || !r.capitalized) {
            portuguese.add(r); // nome português ("Londres") ou minúscula desconhecida (flexão do português)
          }
        }
        // Atração: palavra funcional do idioma-alvo colada a um nome estrangeiro passa a fazer parte dele
        // ("Bank of America", "Jerez de la Frontera"). Funcional que também é do PT (PT_CORE: de, a, e…) só vai
        // junto se estiver ENTRE dois estrangeiros ("Tour de France") ou antes de outra funcional atraída
        // ("de" em "de la") — assim o "de" de "o estado de Jalisco" continua português.
        const fw = FUNCTION_WORDS[lang];
        const initiallyForeign = (t: RawToken | undefined) => !!t && t.kind === 'word' && !portuguese.has(t);
        // vizinho à esquerda de cada palavra, atravessando só espaços (pontuação separa)
        const leftOf = new Map<RawToken, RawToken | undefined>();
        let lastWord: RawToken | undefined;
        for (const r of raws) {
          if (r.kind === 'text') {
            if (r.reason !== 'space') lastWord = undefined;
            continue;
          }
          leftOf.set(r, lastWord);
          lastWord = r;
        }
        const foreignLeft = new Map([...leftOf].map(([r, left]) => [r, initiallyForeign(left)]));
        const attracted = new Set<RawToken>();
        let nextWord: RawToken | undefined;
        for (let i = raws.length - 1; i >= 0; i--) {
          const r = raws[i];
          if (r.kind === 'text') {
            if (r.reason !== 'space') nextWord = undefined; // pontuação e números separam
            continue;
          }
          const key = keyOf(r);
          const candidate =
            nextWord &&
            portuguese.has(r) &&
            !forcePt.has(key) &&
            fw.has(key) &&
            found.get(key) &&
            !portuguese.has(nextWord);
          if (candidate && (!PT_CORE_SET.has(key) || attracted.has(nextWord!) || foreignLeft.get(r))) {
            portuguese.delete(r);
            attracted.add(r);
          }
          nextWord = r;
        }
      }

      const resolve = (r: RawToken, allowParts: boolean): Token[] => {
        if (r.kind === 'text') return [r];
        if (portuguese.has(r)) return [{ kind: 'text', text: r.text, reason: 'portuguese' }];
        const key = keyOf(r);
        const entry = found.get(key);
        if (entry) {
          const [first, ...rest] = entry.prons;
          return [
            {
              kind: 'word',
              original: r.text,
              key,
              origin: 'dictionary',
              source: first.source,
              proper: entry.proper,
              agree: first.agree,
              primary: phonology.render(first.ipa, lang, first.stress, r.text),
              variants: rest.map((p) => phonology.render(p.ipa, lang, p.stress, r.text)),
            },
          ];
        }
        // Composto/elisão fora do dicionário: usa as partes se ao menos uma for conhecida.
        const partsKnown = r.parts?.some((p) => p.kind === 'word' && found.get(keyOf(p)));
        if (allowParts && r.parts && partsKnown) return r.parts.flatMap((p) => resolve(p, false));
        const estimated = stages.estimator?.estimate(key, lang);
        if (estimated) {
          return [
            {
              kind: 'word',
              original: r.text,
              key,
              origin: 'estimated',
              proper: r.capitalized && !r.sentenceStart,
              agree: 0,
              primary: phonology.render(estimated, lang, 'none', r.text),
              variants: [],
            },
          ];
        }
        return [{ kind: 'unknown', original: r.text, key }];
      };
      const tokens = raws.flatMap((r) => resolve(r, true));

      // R11, 2ª parte: em frase, monossílabo funcional vai em minúsculas ("The Guardian" → dhâ GA·di·ân).
      // Sozinho, continua tônico ("the" → DHÂ).
      const wordCount = tokens.filter((t) => t.kind === 'word').length;
      if (wordCount > 1) {
        const fw = FUNCTION_WORDS[lang];
        for (const t of tokens) {
          if (t.kind !== 'word' || !fw.has(t.key) || t.primary.syllables.length !== 1) continue;
          const [only] = t.primary.syllables;
          t.primary = {
            ...t.primary,
            syllables: [{ ...only, text: only.text.toLocaleLowerCase('pt-BR'), stressed: false }],
          };
        }
      }

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
