/**
 * Tipos públicos do motor fonético (T3.1). Contrato: docs/notacao.md, seção 10.
 * O motor é TypeScript puro (sem DOM nem Node): roda no navegador, em Web Worker (T3.10) e nos testes.
 */
import type { Lang } from '@falagringo/data/schema';
import type { SourceId } from '@falagringo/data/sources';

export type { Lang, SourceId };

/** Armadilhas de posição (notação, seção 5.3): geram dicas contextuais, não destaque. */
export type TrapId =
  'TI_DI' | 'CODA_L' | 'CODA_NASAL' | 'FINAL_CONS' | 'S_CLUSTER' | 'FINAL_Z' | 'INITIAL_TAP' | 'CODA_R';

/** Pedaço da grafia PT-BR ligado ao som de origem. */
export interface RenderedSegment {
  /** Grafia PT-BR (ex.: "th", "ss", "â"). */
  text: string;
  /** IPA de origem deste pedaço (ex.: "θ"). */
  ipa: string;
  /** Som que não existe no PT-BR de mídia → destaque laranja (notação, seção 5.1). */
  special: boolean;
}

export interface Syllable {
  /** Grafia final da sílaba, já com MAIÚSCULAS (se tônica) e acentos; sem "·". */
  text: string;
  stressed: boolean;
  segments: RenderedSegment[];
}

/**
 * De onde veio a tônica:
 * - `dictionary`: marcada na fonte;  - `borrowed`: emprestada de outra variante (confiança menor);
 * - `rule`: regra do idioma (T3.4);   - `none`: o idioma não tem tônica (ja, ko, zh) ou não foi possível definir.
 */
export type StressSource = 'dictionary' | 'borrowed' | 'rule' | 'none';

export interface Pronunciation {
  ipa: string;
  /** Forma silabada = sílabas unidas por "·"; forma corrida = sílabas concatenadas (notação, princípio 5). */
  syllables: Syllable[];
  traps: TrapId[];
  stress: StressSource;
}

/** Palavra estrangeira convertida. */
export interface WordToken {
  kind: 'word';
  /** Texto exatamente como digitado. */
  original: string;
  /** Chave de busca (`lookupKey`). */
  key: string;
  /** `dictionary` = achada no dicionário; `estimated` = pronúncia estimada pela grafia (selo "estimado"). */
  origin: 'dictionary' | 'estimated';
  /** Fonte da pronúncia principal, quando veio do dicionário. */
  source?: SourceId;
  /** Nome próprio. */
  proper: boolean;
  /** Quantas outras fontes concordam com a pronúncia principal (indicador de confiança). */
  agree: number;
  primary: Pronunciation;
  /** Outras pronúncias, em ordem de preferência. */
  variants: Pronunciation[];
}

/** Palavra que não está no dicionário e não pôde ser estimada. A interface mostra o original com aviso. */
export interface UnknownToken {
  kind: 'unknown';
  original: string;
  key: string;
}

/** Trecho que não se converte: espaço, pontuação, número (por enquanto) ou palavra em português. */
export interface TextToken {
  kind: 'text';
  text: string;
  reason: 'space' | 'punctuation' | 'number' | 'portuguese';
}

export type Token = WordToken | UnknownToken | TextToken;

export interface ConversionResult {
  lang: Lang;
  tokens: Token[];
  /** Leitura da frase inteira (pronúncia principal de cada palavra; o resto do texto é mantido). */
  reading: {
    /** Sílabas separadas por "·". */
    syllabic: string;
    /** Sílabas concatenadas. */
    flat: string;
  };
  /** União das armadilhas das pronúncias principais, na ordem em que aparecem → dicas contextuais. */
  traps: TrapId[];
}

export interface ConvertOptions {
  /** Limite de caracteres da entrada (padrão 2.000). Acima disso, `convert` rejeita. */
  maxLength?: number;
}
