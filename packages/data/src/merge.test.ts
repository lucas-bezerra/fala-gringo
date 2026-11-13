import { describe, expect, it } from 'vitest';
import {
  borrowEnglishStress,
  comparisonKey,
  countNuclei,
  mergeLanguage,
  normalizeIpa,
  stressPattern,
  stressStatus,
} from './merge';
import { parseMerged, serializeMerged } from './mergedTsv';
import type { Entry, Lang } from './schema';
import type { SourceId } from './sources';

const e = (source: SourceId, word: string, ipa: string, rank = 0, lang: Lang = 'en-GB'): Entry => ({
  word,
  ipa,
  lang,
  source,
  rank,
});
const bySource = (...list: Entry[]) => {
  const m = new Map<SourceId, Entry[]>();
  for (const x of list) m.set(x.source, [...(m.get(x.source) ?? []), x]);
  return m;
};

describe('normalizeIpa', () => {
  it('unifica convenções sem apagar informação', () => {
    expect(normalizeIpa('kɐp', 'en-GB', 'britfone')).toBe('kʌp'); // só no Britfone
    expect(normalizeIpa('kɐp', 'en-GB', 'wiktextract')).toBe('kɐp');
    expect(normalizeIpa('ˈtɪɫ', 'en-US', 'ipa-dict')).toBe('ˈtɪl');
    expect(normalizeIpa('ˈaːlə', 'de-DE', 'ipa-dict')).toBe('ˈaːlə');
    expect(normalizeIpa('ˈt͡ʃuːz.deɪ', 'en-GB', 'wiktextract')).toBe('ˈt͡ʃuːz.deɪ'); // ligadura preservada
    expect(normalizeIpa('gaːs', 'de-DE', 'wikipron')).toBe('ɡaːs');
  });

  it('desrotiza o en-GB (ruído americano no WikiPron)', () => {
    expect(normalizeIpa('eɪkɚ', 'en-GB', 'wikipron')).toBe('eɪkə'); // Acre
    expect(normalizeIpa('bɝd', 'en-GB', 'wikipron')).toBe('bɜːd');
    expect(normalizeIpa('ˈwɔtɚ', 'en-US', 'cmudict')).toBe('ˈwɔtɚ'); // en-US não muda
  });
});

describe('comparisonKey', () => {
  it('ignora tônica, sílaba, ligadura, silábico e oclusiva glotal', () => {
    expect(comparisonKey('ˈt͡ʃuːz.deɪ')).toBe(comparisonKey('tʃuːzdeɪ'));
    expect(comparisonKey('ʔaːlə')).toBe(comparisonKey('ˈaːlə'));
    expect(comparisonKey('æbˈdɒm.ə.nl̩')).toBe(comparisonKey('æbdɒmənl'));
    expect(comparisonKey('kasa')).not.toBe(comparisonKey('kaza'));
  });
});

describe('countNuclei / stressStatus', () => {
  it.each([
    ['ˈbaʊt', 1], // ditongo conta 1
    ['bʁi', 1],
    ['kasa', 2],
    ['bɔ̃ʒuʁ', 2], // vogal nasal (diacrítico) não abre núcleo novo
    ['yːbɐ', 2], // comprimento idem
    ['aːxn̩', 2], // consoante silábica conta
    ['ʃtʁaːsə', 2],
    ['bᵻheɪv', 2], // ᵻ é vogal (Wiktionary)
  ])('%s → %i núcleo(s)', (ipa, n) => {
    expect(countNuclei(ipa)).toBe(n);
  });

  it('classifica a tônica', () => {
    expect(stressStatus('ˈka.za')).toBe('marked');
    expect(stressStatus('bʁi')).toBe('mono');
    expect(stressStatus('kasa')).toBe('none');
  });
});

describe('empréstimo de tônica (en-US → en-GB)', () => {
  it('lê o padrão de tônica por núcleo', () => {
    expect(stressPattern('ˌɪmbəˈsɪləti')).toEqual([2, 0, 1, 0, 0]);
    expect(stressPattern('ˈbaʊt')).toEqual([1]);
    expect(stressPattern('ˈbʌtn̩')).toEqual([1, 0]);
  });

  it.each([
    ['imbecility', 'ɪmbəsɪləti', 'ˌɪmbəˈsɪləti', 'ˌɪmbəˈsɪləti'],
    ['recusal', 'ɹɪkjuːzəl', 'ɹɪˈkjuzəl', 'ɹɪˈkjuːzəl'], // ataque "kj" permitido
    ['Knighton', 'naɪtən', 'ˈnaɪtən', 'ˈnaɪtən'],
    ['shabbification', 'ʃæbɪfɪkeɪ̯ʃən', 'ˌʃæbəfəˈkeɪʃən', 'ˌʃæbɪfɪˈkeɪ̯ʃən'], // diacrítico preservado
    ['judgement', 'd͡ʒʌd͡ʒmənt', 'ˈdʒʌdʒmənt', 'ˈd͡ʒʌd͡ʒmənt'], // ligadura preservada
  ])('%s: %s + %s → %s', (_w, target, donor, expected) => {
    expect(borrowEnglishStress(target, donor)).toBe(expected);
  });

  it('recusa quando o número de sílabas não coincide ou o doador não tem tônica', () => {
    expect(borrowEnglishStress('laɪbɹi', 'ˈlaɪˌbɹɛɹi')).toBeNull(); // library: UK 2 sílabas × US 3
    expect(borrowEnglishStress('kasa', 'kasa')).toBeNull();
    expect(borrowEnglishStress('ˈka.sa', 'ˈkasa')).toBeNull(); // alvo já marcado
  });

  it('limitação conhecida: copia a tônica americana mesmo quando a britânica difere', () => {
    // garage: US gəˈɹɑʒ × UK ˈɡæɹɑːʒ — por isso o status é `borrowed` (confiança menor), não `marked`.
    expect(borrowEnglishStress('ɡæɹɑːʒ', 'ɡəˈɹɑʒ')).toBe('ɡæˈɹɑːʒ');
  });
});

describe('mergeLanguage', () => {
  const PRI: SourceId[] = ['wiktextract', 'britfone', 'wikidata', 'wikipron'];

  it('usa só a fonte de maior prioridade que tem a palavra e registra concordância', () => {
    const { entries, report } = mergeLanguage(
      'en-GB',
      bySource(
        e('wiktextract', 'water', 'ˈwɔː.tə'),
        e('britfone', 'water', 'ˈwɔːtə'),
        e('wikipron', 'water', 'wɔːtə'),
        e('wikipron', 'zebu', 'ziːbuː'),
      ),
      PRI,
    );
    expect(entries).toEqual([
      {
        word: 'water',
        ipa: 'ˈwɔː.tə',
        lang: 'en-GB',
        rank: 0,
        source: 'wiktextract',
        stress: 'marked',
        kind: 'common',
        agree: ['britfone', 'wikipron'],
      },
      {
        word: 'zebu',
        ipa: 'ziːbuː',
        lang: 'en-GB',
        rank: 0,
        source: 'wikipron',
        stress: 'none',
        kind: 'common',
        agree: [],
      },
    ]);
    expect(report).toMatchObject({
      words: 2,
      chosen: { wiktextract: 1, wikipron: 1 },
      shadowed: { britfone: 1, wikipron: 1 },
      stress: { marked: 1, mono: 0, none: 1 },
      agreed: 1,
      multiSource: 1,
    });
  });

  it('mantém as variantes da fonte escolhida e descarta as que ficam iguais após normalizar', () => {
    const { entries } = mergeLanguage(
      'en-GB',
      bySource(
        e('britfone', 'cup', 'kɐp', 0),
        e('britfone', 'cup', 'kʌp', 1),
        e('britfone', 'cup', 'kʊp', 2),
      ),
      PRI,
    );
    expect(entries.map((x) => [x.ipa, x.rank])).toEqual([
      ['kʌp', 0],
      ['kʊp', 1],
    ]);
  });

  it('junta grafias que só diferem em maiúsculas e herda "nome próprio" de qualquer fonte', () => {
    const { entries } = mergeLanguage(
      'en-GB',
      bySource(e('wiktextract', 'Greenwich', 'ˈɡɹɛn.ɪt͡ʃ'), {
        ...e('wikidata', 'greenwich', 'ˈɡɹɛnɪtʃ'),
        kind: 'proper',
      }),
      PRI,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ word: 'Greenwich', kind: 'proper', agree: ['wikidata'] });
  });

  it('empresta a tônica do doador só às pronúncias sem tônica', () => {
    const donor = new Map([
      ['recusal', 'ɹɪˈkjuzəl'],
      ['water', 'ˈwɔtɚ'],
    ]);
    const { entries, report } = mergeLanguage(
      'en-GB',
      bySource(e('wiktextract', 'water', 'ˈwɔː.tə'), e('wikipron', 'recusal', 'ɹɪkjuːzəl')),
      PRI,
      { stressDonor: donor },
    );
    expect(entries.map((x) => [x.word, x.ipa, x.stress])).toEqual([
      ['recusal', 'ɹɪˈkjuːzəl', 'borrowed'],
      ['water', 'ˈwɔː.tə', 'marked'],
    ]);
    expect(report.stress).toEqual({ marked: 1, borrowed: 1, mono: 0, none: 0 });
  });

  it('não lê fontes fora da lista de prioridade do idioma', () => {
    const { entries } = mergeLanguage('en-US', bySource(e('ipa-dict', 'til', 'ˈtɪɫ', 0, 'en-US')));
    expect(entries).toEqual([]);
  });
});

describe('formato mesclado', () => {
  it('faz ida e volta sem perda', () => {
    const { entries } = mergeLanguage(
      'it-IT',
      bySource(
        e('wiktextract', 'casa', 'ˈka.za', 0, 'it-IT'),
        e('wiktextract', 'casa', 'ˈka.sa', 1, 'it-IT'),
        e('wikipron', 'casa', 'kaza', 0, 'it-IT'),
      ),
    );
    const parsed = parseMerged(serializeMerged('it-IT', entries));
    expect(parsed.lang).toBe('it-IT');
    expect(parsed.entries).toEqual(entries);
    expect(entries[0].agree).toEqual(['wikipron']);
  });

  it('rejeita linha inválida', () => {
    const text =
      '#falagringo-merged v1\n#lang it-IT\nword\tipa\trank\tsource\tstress\tkind\tagree\ncasa\tkaza\t0\tfoo\tnone\tcommon\t\n';
    expect(() => parseMerged(text)).toThrow(/Linha 4/);
  });
});
