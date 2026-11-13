import { describe, expect, it } from 'vitest';
import type { Lang } from '../types';
import { parseIpa } from './parse';
import { legalOnset, spanishStressFromEnd, syllabify, type SyllabifyOptions } from './syllabify';

/** Forma compacta: sílabas separadas por "·", tônica primária em MAIÚSCULA ("ˈ" na frente), secundária com "ˌ". */
const syl = (ipa: string, lang: Lang, opts: SyllabifyOptions = {}) => {
  const r = syllabify(parseIpa(ipa, lang), lang, opts);
  const words = r.words.map((w) =>
    w.syllables
      .map(
        (s) =>
          (s.stress === 1 ? 'ˈ' : s.stress === 2 ? 'ˌ' : '') +
          [...s.onset, ...s.nucleus, ...s.coda].map((p) => p.text).join(''),
      )
      .join('·'),
  );
  return `${words.join(' ')} [${r.stress}]`;
};

describe('syllabify — fronteiras', () => {
  it('inglês: ataque máximo com os encontros do inglês; ignora os pontos (convenção de Wells) da fonte', () => {
    expect(syl('kəmˈpjutɚ', 'en-US')).toBe('kəm·ˈpju·tɚ [dictionary]');
    expect(syl('ɪkˈspleɪn', 'en-US')).toBe('ɪk·ˈspleɪn [dictionary]');
    expect(syl('ˈæb.ə', 'en-GB')).toBe('ˈæ·bə [dictionary]');
  });

  it('o "." da fonte manda (it); sem ele, s + consoante fica com a sílaba anterior', () => {
    expect(syl('ˈsu.bi.to', 'it-IT')).toBe('ˈsu·bi·to [dictionary]');
    expect(syl('aˈɡosta', 'it-IT')).toBe('a·ˈɡos·ta [dictionary]');
  });

  it('encontros: obstruinte + líquida/semivogal; semivogal só onde o idioma permite', () => {
    expect(syl('estaθjon', 'es-ES', { word: 'estación' })).toBe('es·ta·ˈθjon [rule]');
    expect(syl('ˈaːbɪljɛt', 'nl-NL')).toBe('ˈaː·bɪl·jɛt [dictionary]');
    expect(syl('ˈabside', 'it-IT')).toBe('ˈab·si·de [dictionary]');
  });

  it('a marca de tônica não define fronteira (sueco marca dentro do encontro)', () => {
    expect(syl('akˈoːɖ', 'sv-SE')).toBe('a·ˈkoːɖ [dictionary]');
  });

  it('ditongos, vogais longas, consoante silábica e palavra sem vogal', () => {
    expect(syl('ɡozaimasɯ̥', 'ja-JP')).toBe('ɡo·zai·ma·sɯ̥ [none]');
    expect(syl('ˈaːxn̩', 'de-DE')).toBe('ˈaː·xn̩ [dictionary]');
    expect(syl('hm', 'en-US')).toBe('ˈhm [dictionary]'); // monossílabo: tônica implícita
  });

  it('tom fica na sílaba; várias palavras de IPA', () => {
    const r = syllabify(parseIpa('t͡sʰʊŋ˦˨t͡ɕʰin˨˩˧', 'zh-CN'), 'zh-CN');
    expect(r.words[0].syllables.map((s) => s.tone)).toEqual(['˦˨', '˨˩˧']);
    expect(syl('ˈwɔtɚ ˈplis', 'en-US')).toBe('ˈwɔ·tɚ ˈplis [dictionary]');
  });

  it('legalOnset expõe a regra', () => {
    const ph = (ipa: string) => parseIpa(ipa).filter((t) => t.kind === 'phone') as never[];
    expect(legalOnset(ph('tʁ'), 'fr-FR')).toBe(true);
    expect(legalOnset(ph('st'), 'es-ES')).toBe(false);
    expect(legalOnset(ph('ŋ'), 'de-DE')).toBe(false);
    expect(legalOnset(ph('kj'), 'it-IT')).toBe(true);
    expect(legalOnset(ph('xj'), 'nl-NL')).toBe(false);
  });
});

describe('syllabify — tônica', () => {
  it('usa a marca da fonte e repassa "emprestada"', () => {
    expect(syl('ɹɪˈkjuːzəl', 'en-GB', { stress: 'borrowed' })).toBe('ɹɪ·ˈkjuː·zəl [borrowed]');
  });

  it('monossílabo sem marca é tônico; japonês/coreano/chinês nunca têm tônica', () => {
    expect(syl('bʁi', 'fr-FR')).toBe('ˈbʁi [dictionary]');
    expect(syl('aɾiɡatoː', 'ja-JP')).toBe('a·ɾi·ɡa·toː [none]');
    expect(syl('ˈkamsa', 'ko-KR')).toBe('kam·sa [none]');
  });

  it('regras por idioma quando a fonte não marca', () => {
    expect(syl('donde', 'es-ES', { word: 'dónde' })).toBe('ˈdon·de [rule]');
    expect(syl('kasa', 'es-419', { word: 'casa' })).toBe('ˈka·sa [rule]');
    expect(syl('bɔ̃ʒuʁ', 'fr-FR')).toBe('bɔ̃·ˈʒuʁ [rule]');
    expect(syl('bəʃtɪmt', 'de-DE')).toBe('bə·ˈʃtɪmt [rule]'); // pula o prefixo reduzido; ʃt abre sílaba
    expect(syl('ˈkɪstə', 'de-DE')).toBe('ˈkɪs·tə [dictionary]'); // st com s simples divide
    expect(syl('əbaʊt', 'en-GB', { word: 'about' })).toBe('ə·ˈbaʊt [rule]');
    expect(syl('ɪmbəsɪləti', 'en-GB', { word: 'imbecility' })).toBe('ɪm·bə·ˈsɪ·lə·ti [rule]'); // -ity: antepenúltima
    expect(syl('neɪʃən', 'en-GB', { word: 'nation' })).toBe('ˈneɪ·ʃən [rule]'); // -tion: a anterior
  });
});

describe('spanishStressFromEnd', () => {
  it.each([
    ['dónde', 2],
    ['estación', 1],
    ['casa', 2],
    ['ciudad', 1],
    ['país', 1],
    ['día', 2],
    ['quieres', 2],
    ['árbol', 2],
    ['reloj', 1],
    ['murciélago', 3],
  ])('%s → %i', (word, n) => {
    expect(spanishStressFromEnd(word)).toBe(n);
  });
});
