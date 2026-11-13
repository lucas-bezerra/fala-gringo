/**
 * Registro das fontes de dados permitidas — espelho em código do SOURCES.md.
 * O validador rejeita qualquer entrada cuja fonte não esteja aqui.
 * Para adicionar uma fonte: registre a licença no SOURCES.md PRIMEIRO, depois aqui.
 *
 * `stress` indica se o IPA da fonte traz marcas de tônica (ˈ ˌ):
 *  - `yes`: sempre que a palavra tem mais de uma sílaba;
 *  - `no`: nunca (a tônica precisa vir de outra fonte ou de regra do idioma);
 *  - `varies`: depende do arquivo/idioma (ver nota).
 * O merge (T2.6) e o motor (T3.4) usam isso para não confundir "sem marca" com "sem tônica".
 */
type Stress = 'yes' | 'no' | 'varies';

export const SOURCES = {
  'ipa-dict': {
    name: 'open-dict-data/ipa-dict',
    license: 'MIT (repositório); cada conjunto mantém a licença original — ver raw/ipa-dict/LICENSES.md',
    shareAlike: true, // de, ja, ko, sv são CC BY-SA
    url: 'https://github.com/open-dict-data/ipa-dict',
    credit:
      'open-dict-data/ipa-dict (MIT) e os conjuntos de origem listados em raw/ipa-dict/LICENSES.md (cmudict-ipa, german-ipa-dict, EDICT/EDRDG, korean-word-ipa-dictionary, INT, Folkets lexikon)',
    stress: 'varies', // en_US, de, nl, sv: sim (≥ 89% das linhas); ja e ko: não
  },
  cmudict: {
    name: 'CMUdict',
    license: 'BSD-2 (Carnegie Mellon University)',
    url: 'https://github.com/cmusphinx/cmudict',
    credit:
      'Copyright (C) 1993-2015 Carnegie Mellon University. Texto integral da licença em raw/cmudict/LICENSE.',
    shareAlike: false,
    stress: 'yes',
  },
  britfone: {
    name: 'Britfone',
    license: 'MIT',
    url: 'https://github.com/JoseLlarena/Britfone',
    credit: 'Copyright (c) 2017 Jose Llarena (MIT).',
    shareAlike: false,
    stress: 'yes', // 16.117 de 16.204 linhas
  },
  wikipron: {
    name: 'WikiPron (dados do Wiktionary)',
    license: 'CC BY-SA 4.0',
    url: 'https://github.com/CUNY-CL/wikipron',
    credit: 'Contribuidores do Wiktionary, via WikiPron (Lee et al., LREC 2020).',
    shareAlike: true,
    stress: 'no', // os TSV publicados removem ˈ ˌ e as fronteiras de sílaba
  },
  wiktextract: {
    name: 'Wiktionary via wiktextract/kaikki.org',
    // O kaikki.org não declara licença; os dados são extraídos do Wiktionary e herdam a CC BY-SA 4.0.
    license: 'CC BY-SA 4.0 (herdada do Wiktionary)',
    url: 'https://kaikki.org',
    credit: 'Contribuidores do Wiktionary, via wiktextract/kaikki.org (Ylonen, LREC 2022).',
    shareAlike: true,
    stress: 'yes', // IPA original do Wiktionary, com ˈ ˌ e fronteiras de sílaba
  },
  wikidata: {
    name: 'Wikidata (P898)',
    license: 'CC0',
    url: 'https://www.wikidata.org',
    credit: 'Contribuidores do Wikidata (CC0; crédito por cortesia).',
    shareAlike: false,
    stress: 'varies',
  },
  jmdict: {
    name: 'JMdict (EDRDG)',
    license: 'CC BY-SA 4.0',
    url: 'https://www.edrdg.org/jmdict/j_jmdict.html',
    credit:
      'Electronic Dictionary Research and Development Group (EDRDG). Exige crédito em cada tela e atualização mensal.',
    shareAlike: true,
    stress: 'no',
  },
  // Sempre ACRESCENTAR no fim: os shards guardam o índice da fonte nesta ordem (SOURCE_ORDER).
  frequencywords: {
    name: 'FrequencyWords (OpenSubtitles 2018)',
    license: 'CC BY-SA 4.0 (conteúdo); MIT (código)',
    url: 'https://github.com/hermitdave/FrequencyWords',
    credit:
      'Hermit Dave, FrequencyWords, a partir do corpus OpenSubtitles 2018 (OPUS). Usada no léxico do português e no relatório de cobertura.',
    shareAlike: true,
    stress: 'no',
  },
} as const satisfies Record<
  string,
  { name: string; license: string; url: string; credit: string; shareAlike: boolean; stress: Stress }
>;

export type SourceId = keyof typeof SOURCES;

export function isSourceId(value: string): value is SourceId {
  return Object.hasOwn(SOURCES, value);
}
