import { describe, expect, it } from 'vitest';
import type { Lang } from '../types';
import { parseIpa, phonesOf, serializeIpa, type IpaToken } from './parse';

/** Forma compacta: sons pela base (+traços), marcas pelo tipo. */
const show = (ipa: string, lang?: Lang) =>
  parseIpa(ipa, lang).map((t: IpaToken) => {
    if (t.kind !== 'phone')
      return t.kind === 'stress' ? (t.level === 1 ? 'ˈ' : 'ˌ') : `<${t.kind}:${t.text}>`;
    const extra = [...t.features, ...(t.tone ? [`tom:${t.tone}`] : [])];
    return t.base + (extra.length ? `{${extra.join(',')}}` : '');
  });

// Casos reais tirados do inventário dos dados mesclados (INVENTORY.md).
const REAL: [Lang, string][] = [
  ['de-DE', 'nʊlkɔmat͡svaɪ̯ˈliːtɐˌflaʃə'],
  ['de-DE', 'tyːɐ̯lɪç'],
  ['de-DE', 'ˈaɪ̯ns ˌkɔma ˈzɛks ˈliːtɐ ˌbɛnˈt͡siːnɐ'],
  ['de-DE', 'diː ˈzaxə ʔɪst ˌdiː | ʔʊnt deːɐ̯'],
  ['de-DE', 'ˈveːɐ̯ ɪm ˈɡlaːsˌhaʊ̯s ˈzɪt͡st ǀ ˈsɔl'],
  ['de-DE', 'mɪt ˌkɪnt⁀ʊnt ˈkeːɡl̩'],
  ['de-DE', 'hɔlʦˈkɪʁçən'],
  ['de-DE', 'l̩aʊ̯phɔlt͜s'],
  ['de-DE', '↗ˈdaː liːkt deːɐ̯ ↘ˈhʊnt'],
  ['ko-KR', 'ka̠ɡa̠k̚k͈o̞'],
  ['ja-JP', 'aisatsɯmaɰᵝaɾi'],
  ['sv-SE', '²ˈɑːɪnkˈɔmːst'],
  ['zh-CN', 'ʈʂʰə̌ŋ.tú'],
  ['zh-CN', 't͡sʰʊŋ˦˨t͡ɕʰin˨˩˧'],
  ['en-GB', 'ˈkɑːsəl ɡɹ̠iːn'],
  ['en-GB', 'ˌækəˈdɛmɪk ˈkwɔːtə(r'],
  ['en-GB', 'ˈ-ənd͡ʒ'],
  ['en-US', 'piːliːbʱiːt̪ ˈtaɪɡə'],
  ['fr-FR', 'aˌksɑ̃ːt‿ɛˈɡyː'],
  ['it-IT', 'seːː˥˩'],
];

describe('parseIpa — ida e volta', () => {
  it.each(REAL)('%s /%s/', (lang, ipa) => {
    expect(serializeIpa(parseIpa(ipa, lang))).toBe(ipa.normalize('NFC'));
    expect(serializeIpa(parseIpa(ipa))).toBe(ipa.normalize('NFC'));
  });
});

describe('parseIpa — estrutura', () => {
  it('africadas: ligadura (qualquer forma), letra-ligadura e, por idioma, sem ligadura', () => {
    expect(show('t͡ʃa')).toEqual(['t͡ʃ', 'a']);
    expect(show('t͜sa')).toEqual(['t͡s', 'a']); // ligadura de baixo normalizada
    expect(show('hɔlʦ')).toEqual(['h', 'ɔ', 'l', 't͡s']); // ʦ → t͡s
    expect(show('ˈtʃɝtʃ', 'en-US')).toEqual(['ˈ', 't͡ʃ', 'ɝ', 't͡ʃ']); // church
    expect(show('kæts', 'en-US')).toEqual(['k', 'æ', 't', 's']); // cats: encontro, não africada
    expect(show('tsɯnami', 'ja-JP')).toEqual(['t͡s', 'ɯ', 'n', 'a', 'm', 'i']);
    expect(show('tsʰa', 'ja-JP')).toEqual(['t͡s{aspirated}', 'a']);
  });

  it('ditongos: explícitos (̯) em qualquer idioma; sem marca só pela lista do idioma', () => {
    expect(show('vaɪ̯n', 'de-DE')).toEqual(['v', 'aɪ', 'n']); // ̯ some no ditongo agrupado
    expect(show('ˈbaʊt', 'en-US')).toEqual(['ˈ', 'b', 'aʊ', 't']);
    expect(show('ˈbaʊt', 'ja-JP')).toEqual(['ˈ', 'b', 'a', 'ʊ', 't']); // japonês não agrupa
    expect(show('aisatsɯ', 'ja-JP')).toEqual(['a', 'i', 's', 'a', 't͡s', 'ɯ']);
    expect(show('ˈdi.a', 'en-US')).toEqual(['ˈ', 'd', 'i', '<syllable:.>', 'a']); // hiato marcado
  });

  it('traços: nasal, longa, aspirada, tensa, sem soltura, silábica, cedilha como letra', () => {
    expect(show('bɔ̃ːʒuʁ')).toEqual(['b', 'ɔ{nasal,long}', 'ʒ', 'u', 'ʁ']);
    expect(show('k̚k͈o̞')).toEqual(['k{unreleased}', 'k{fortis}', 'o{lowered}']);
    expect(show('ˈaːxn̩')).toEqual(['ˈ', 'a{long}', 'x', 'n{syllabic}']);
    expect(show('ɪç')).toEqual(['ɪ', 'ç']); // a cedilha é parte da letra, não traço
    expect(show('aɾɯɸaɰᵝa')).toEqual(['a', 'ɾ', 'ɯ', 'ɸ', 'a', 'ɰ{compressed}', 'a']);
  });

  it('tons: letras, dígitos e acento sobre a vogal', () => {
    expect(show('t͡sʰʊŋ˦˨')).toEqual(['t͡s{aspirated}', 'ʊ', 'ŋ', '<tone:˦˨>']);
    expect(show('²ˈɑː')).toEqual(['<tone:²>', 'ˈ', 'ɑ{long}']);
    expect(show('ʈʂʰə̌ŋ.tú')).toEqual([
      'ʈ',
      'ʂ{aspirated}',
      'ə{tom:rising}',
      'ŋ',
      '<syllable:.>',
      't',
      'u{tom:high}',
    ]);
  });

  it('pausa, ligação e outros: preservados como tokens', () => {
    expect(show('diː | ʔʊnt')).toEqual([
      'd',
      'i{long}',
      '<space: >',
      '<prosody:|>',
      '<space: >',
      'ʔ',
      'ʊ',
      'n',
      't',
    ]);
    expect(show('st ǀ ˈs')).toContain('<prosody:ǀ>'); // entre espaços: pausa
    expect(show('ǀa')).toEqual(['ǀ', 'a']); // colado: clique dental
    expect(show('t‿ɛ')).toEqual(['t', '<link:‿>', 'ɛ']);
    expect(show('ˈ-ənd͡ʒ')).toEqual(['ˈ', '<other:->', 'ə', 'n', 'd͡ʒ']);
  });

  it('phonesOf devolve só os sons', () => {
    expect(phonesOf(parseIpa('ˈwɔː.tə')).map((p) => p.base)).toEqual(['w', 'ɔ', 't', 'ə']);
    expect(phonesOf(parseIpa('ˈwɔː.tə')).every((p) => typeof p.vowel === 'boolean')).toBe(true);
  });
});
