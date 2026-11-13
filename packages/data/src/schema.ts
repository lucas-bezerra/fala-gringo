/**
 * Formato intermediário único dos dicionários (T2.1).
 * Todo importador (T2.2–T2.5) grava neste formato; a normalização/merge (T2.6)
 * e o gerador de shards (T2.7) só leem este formato. Documentação: ../SCHEMA.md
 */
import { isSourceId, type SourceId } from './sources';

/** Idiomas e variantes regionais, como tags BCP 47. */
export const LANGS = [
  'en-US',
  'en-GB',
  'es-ES',
  'es-419',
  'fr-FR',
  'de-DE',
  'it-IT',
  'ja-JP',
  'ko-KR',
  'zh-CN',
  'nl-NL',
  'sv-SE',
] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

export type EntryKind = 'common' | 'proper';

export interface Entry {
  /** Grafia original da palavra (NFC). Mantém maiúsculas de nomes próprios. */
  word: string;
  /** Transcrição IPA (NFC), sem barras nem colchetes. Mantém ˈ ˌ . quando a fonte os tiver. */
  ipa: string;
  lang: Lang;
  source: SourceId;
  /** Ordem da pronúncia entre as variantes da mesma palavra, idioma e fonte. 0 = principal. */
  rank: number;
  /** Frequência de uso (ocorrências por milhão), quando a fonte informar. */
  freq?: number;
  /** `proper` = nome próprio (pessoa, lugar, clube). Padrão: `common`. */
  kind?: EntryKind;
}

/** Chave de busca: NFC + minúsculas conforme as regras do idioma. */
export function lookupKey(word: string, lang: Lang): string {
  return word.normalize('NFC').toLocaleLowerCase(lang);
}

export type Severity = 'error' | 'warning';
export interface Issue {
  severity: Severity;
  field: keyof Entry;
  message: string;
}

/**
 * Caracteres aceitos no IPA, testados sobre a forma NFD (vogais com diacrítico, como `õ` e `ä`,
 * viram base + combinante): letras latinas básicas, æ ç ð ø ħ ŋ œ, extensões IPA (U+0250–02AF),
 * modificadores (U+02B0–02FF), diacríticos combinantes (U+0300–036F), letras gregas β θ χ,
 * extensões fonéticas (U+1D00–1DBF, ex.: ᵝ do japonês), sobrescritos ¹ ² ³ (acento tonal do sueco),
 * prosódia | ‖ ↗ ↘, separador de sílaba, ligadura ‿ e espaço.
 * Validado contra os dicionários de raw/ipa-dict: só o hífen do coreano fica de fora (aviso proposital).
 */
/* eslint-disable no-misleading-character-class -- a faixa de diacríticos combinantes é intencional */
const IPA_CHARS =
  /^[a-z\u00e6\u00e7\u00f0\u00f8\u0127\u014b\u0153\u0250-\u02af\u02b0-\u02ff\u0300-\u036f\u03b2\u03b8\u03c7\u1d00-\u1dbf\u00b9\u00b2\u00b3|\u2016\u2197\u2198.\u203f ]+$/u;
/* eslint-enable no-misleading-character-class */

export function validateEntry(entry: Entry): Issue[] {
  const issues: Issue[] = [];
  const err = (field: keyof Entry, message: string) => issues.push({ severity: 'error', field, message });
  const warn = (field: keyof Entry, message: string) => issues.push({ severity: 'warning', field, message });

  // word
  if (!entry.word || !entry.word.trim()) err('word', 'vazia');
  else {
    if (/[\t\n\r]/.test(entry.word)) err('word', 'contém tab ou quebra de linha');
    if (entry.word !== entry.word.trim()) err('word', 'espaços nas pontas');
    if (entry.word !== entry.word.normalize('NFC')) err('word', 'não está em NFC');
  }

  // ipa
  if (!entry.ipa || !entry.ipa.trim()) err('ipa', 'vazia');
  else {
    if (/[\t\n\r]/.test(entry.ipa)) err('ipa', 'contém tab ou quebra de linha');
    if (/[/[\]]/.test(entry.ipa)) err('ipa', 'contém barras ou colchetes (o importador deve removê-los)');
    if (entry.ipa.includes(','))
      err('ipa', 'contém vírgula (variantes devem virar entradas separadas, com rank)');
    if (entry.ipa !== entry.ipa.trim()) err('ipa', 'espaços nas pontas');
    if (entry.ipa !== entry.ipa.normalize('NFC')) err('ipa', 'não está em NFC');
    const ipaHasError = issues.some((i) => i.field === 'ipa');
    if (!ipaHasError && !IPA_CHARS.test(entry.ipa.normalize('NFD')))
      warn('ipa', `caracteres fora do conjunto IPA esperado: ${unexpectedIpaChars(entry.ipa)}`);
  }

  // lang / source
  if (!isLang(entry.lang)) err('lang', `idioma não suportado: ${String(entry.lang)}`);
  if (!isSourceId(entry.source))
    err('source', `fonte não registrada: ${String(entry.source)} (registre no SOURCES.md e em sources.ts)`);

  // rank / freq / kind
  if (!Number.isInteger(entry.rank) || entry.rank < 0) err('rank', 'deve ser inteiro >= 0');
  if (entry.freq !== undefined && (!Number.isFinite(entry.freq) || entry.freq < 0))
    err('freq', 'deve ser número finito >= 0');
  if (entry.kind !== undefined && entry.kind !== 'common' && entry.kind !== 'proper')
    err('kind', `valor inválido: ${String(entry.kind)}`);

  return issues;
}

function unexpectedIpaChars(ipa: string): string {
  const bad = new Set<string>();
  for (const ch of ipa.normalize('NFD'))
    if (!IPA_CHARS.test(ch))
      bad.add(`${ch} (U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`);
  return [...bad].join(', ');
}
