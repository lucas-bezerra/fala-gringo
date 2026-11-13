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
    stress: 'varies', // en_US, de, nl, sv: sim (≥ 89% das linhas); ja e ko: não
  },
  cmudict: {
    name: 'CMUdict',
    license: 'BSD-2 (Carnegie Mellon University)',
    shareAlike: false,
    stress: 'yes',
  },
  britfone: { name: 'Britfone', license: 'MIT', shareAlike: false, stress: 'varies' }, // a confirmar na importação
  wikipron: {
    name: 'WikiPron (dados do Wiktionary)',
    license: 'CC BY-SA 4.0',
    shareAlike: true,
    stress: 'no', // os TSV publicados removem ˈ ˌ e as fronteiras de sílaba
  },
  wikidata: { name: 'Wikidata (P898)', license: 'CC0', shareAlike: false, stress: 'varies' },
  jmdict: { name: 'JMdict (EDRDG)', license: 'CC BY-SA 4.0', shareAlike: true, stress: 'no' },
} as const satisfies Record<string, { name: string; license: string; shareAlike: boolean; stress: Stress }>;

export type SourceId = keyof typeof SOURCES;

export function isSourceId(value: string): value is SourceId {
  return Object.hasOwn(SOURCES, value);
}
