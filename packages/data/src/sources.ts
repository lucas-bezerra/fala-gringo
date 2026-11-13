/**
 * Registro das fontes de dados permitidas — espelho em código do SOURCES.md.
 * O validador rejeita qualquer entrada cuja fonte não esteja aqui.
 * Para adicionar uma fonte: registre a licença no SOURCES.md PRIMEIRO, depois aqui.
 */
export const SOURCES = {
  'ipa-dict': {
    name: 'open-dict-data/ipa-dict',
    license: 'MIT (repositório); cada conjunto mantém a licença original — ver raw/ipa-dict/LICENSES.md',
    shareAlike: true, // de, ja, ko, sv são CC BY-SA
  },
  cmudict: { name: 'CMUdict', license: 'BSD-2 (Carnegie Mellon University)', shareAlike: false },
  britfone: { name: 'Britfone', license: 'MIT', shareAlike: false },
  wikipron: { name: 'WikiPron (dados do Wiktionary)', license: 'CC BY-SA 4.0', shareAlike: true },
  wikidata: { name: 'Wikidata (P898)', license: 'CC0', shareAlike: false },
  jmdict: { name: 'JMdict (EDRDG)', license: 'CC BY-SA 4.0', shareAlike: true },
} as const satisfies Record<string, { name: string; license: string; shareAlike: boolean }>;

export type SourceId = keyof typeof SOURCES;

export function isSourceId(value: string): value is SourceId {
  return Object.hasOwn(SOURCES, value);
}
