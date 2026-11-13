import { describe, expect, it } from 'vitest';
import { validateEntry } from '../schema';
import { SOURCES } from '../sources';
import { TARGETS, cleanKaikkiIpa, importWiktextract, pickPronunciations } from './wiktextract';

// Objetos no formato do kaikki.org (amostras reais de "free" e "gratis", resumidas).
const FREE = {
  word: 'free',
  lang_code: 'en',
  sounds: [
    { tags: ['Received-Pronunciation'], ipa: '/fɹiː/' },
    { tags: ['Received-Pronunciation'], ipa: '[fɹɪi̯]' },
    { tags: ['British', 'Southern', 'Standard'], ipa: '/fɹɪj/' },
    { tags: ['General-American'], ipa: '/fɹi/' },
    { rhymes: '-iː' },
  ],
};

describe('cleanKaikkiIpa', () => {
  it('aceita só fonêmica, remove barras e segmentos opcionais', () => {
    expect(cleanKaikkiIpa('/ˈɡra.tis/')).toBe('ˈɡra.tis');
    expect(cleanKaikkiIpa('/ˈwɔː.tə(ɹ)/')).toBe('ˈwɔː.tə'); // consoante opcional sai
    expect(cleanKaikkiIpa('/ɡ(ə)ˈɹɑʒ/')).toBe('ɡəˈɹɑʒ'); // vogal opcional fica: a tônica não cai no meio do ataque
    expect(cleanKaikkiIpa('/₍ˌ₎daɪˈæn/')).toBe('ˌdaɪˈæn');
    expect(cleanKaikkiIpa('[fɹɪi̯]')).toBeNull();
  });

  it('descarta fragmentos e alternativas compactadas', () => {
    expect(cleanKaikkiIpa('/-di/')).toBeNull();
    expect(cleanKaikkiIpa('/ˈwɛnz-/')).toBeNull();
    expect(cleanKaikkiIpa('/kraʃˌʃa.re~.kreʃˈʃa.re/')).toBeNull();
  });
});

describe('pickPronunciations', () => {
  it('en-GB: só a britânica padrão (RP/UK); ignora americana, estreita e Southern Standard', () => {
    expect(pickPronunciations(FREE, TARGETS['en-GB'])).toEqual([{ word: 'free', ipa: 'fɹiː' }]);
  });

  it('en-GB: ignora variantes regionais e qualificadas', () => {
    const tuesday = {
      word: 'Tuesday',
      lang_code: 'en',
      sounds: [
        { tags: ['Received-Pronunciation', 'UK'], ipa: '/ˈtjuːz.deɪ/' },
        { tags: ['Northumbria', 'UK'], ipa: '/ˈtjuːzdə/' },
        { tags: ['Received-Pronunciation', 'dated'], ipa: '/ˈtjuːzdɪ/' },
      ],
    };
    expect(pickPronunciations(tuesday, TARGETS['en-GB'])).toEqual([{ word: 'Tuesday', ipa: 'ˈtjuːz.deɪ' }]);
  });

  it('it-IT: pega todas as fonêmicas do italiano e ignora outros idiomas e afixos', () => {
    const it = TARGETS['it-IT'];
    expect(
      pickPronunciations({ word: 'gratis', lang_code: 'it', sounds: [{ ipa: '/ˈɡra.tis/' }] }, it),
    ).toEqual([{ word: 'gratis', ipa: 'ˈɡra.tis' }]);
    expect(pickPronunciations(FREE, it)).toEqual([]);
    expect(pickPronunciations({ word: '-ità', lang_code: 'it', sounds: [{ ipa: '/iˈta/' }] }, it)).toEqual(
      [],
    );
  });
});

describe('importWiktextract', () => {
  it('numera variantes, descarta repetidas e gera entradas válidas com tônica', () => {
    const entries = importWiktextract('casa\tˈka.za\ncasa\tˈka.sa\ncasa\tˈka.za\n', 'it-IT');
    expect(entries.map((e) => [e.ipa, e.rank])).toEqual([
      ['ˈka.za', 0],
      ['ˈka.sa', 1],
    ]);
    for (const e of entries) expect(validateEntry(e)).toEqual([]);
    expect(SOURCES.wiktextract.stress).toBe('yes');
  });
});
