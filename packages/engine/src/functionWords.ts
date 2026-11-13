/**
 * Palavras funcionais (artigos, preposições, conjunções) de cada idioma-alvo — usadas no modo texto misto para
 * "atrair" para o nome estrangeiro as palavras pequenas que fazem parte dele: "Jerez *de la* Frontera",
 * "Bank *of* America". Chaves em minúsculas (lookupKey).
 */
import type { Lang } from './types';

const EN = ['the', 'a', 'an', 'of', 'and', 'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with'];
const ES = ['el', 'la', 'los', 'las', 'lo', 'de', 'del', 'y', 'e', 'en', 'un', 'una', 'al', 'a'];

export const FUNCTION_WORDS: Record<Lang, ReadonlySet<string>> = {
  'en-US': new Set(EN),
  'en-GB': new Set(EN),
  'es-ES': new Set(ES),
  'es-419': new Set(ES),
  'fr-FR': new Set([
    'le',
    'la',
    'les',
    "l'",
    'de',
    'du',
    'des',
    "d'",
    'et',
    'en',
    'au',
    'aux',
    'un',
    'une',
    'sur',
    'sous',
  ]),
  'it-IT': new Set([
    'il', 'lo', 'la', 'i', 'gli', 'le', "l'", 'di', 'del', 'della', 'dello', 'dei', 'delle', 'degli', 'e', 'in',
    'a', 'al', 'alla', 'da', 'dal', 'dalla', 'un', 'una', 'sul', 'sulla',
  ]), // prettier-ignore
  'de-DE': new Set([
    'der', 'die', 'das', 'den', 'dem', 'des', 'von', 'vom', 'zu', 'zum', 'zur', 'und', 'im', 'am', 'an', 'auf',
    'bei', 'ein', 'eine', 'unter', 'über',
  ]), // prettier-ignore
  'nl-NL': new Set(['de', 'het', 'een', 'van', 'en', 'in', 'op', 'aan', 'ter', 'ten']),
  'sv-SE': new Set(['och', 'i', 'på', 'av', 'en', 'ett', 'den', 'det']),
  'ja-JP': new Set(),
  'ko-KR': new Set(),
  'zh-CN': new Set(),
};
