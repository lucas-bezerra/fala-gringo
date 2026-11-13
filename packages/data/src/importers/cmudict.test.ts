import { describe, expect, it } from 'vitest';
import { validateEntry } from '../schema';
import { arpabetToIpa, importCmudict } from './cmudict';

// Entradas ARPAbet copiadas do cmudict.dict oficial (commit 74790861f652); IPA esperado escrito à mão.
const KNOWN: [word: string, arpabet: string, ipa: string][] = [
  ['about', 'AH0 B AW1 T', 'əˈbaʊt'],
  ['ahead', 'AH0 HH EH1 D', 'əˈhɛd'],
  ['america', 'AH0 M EH1 R AH0 K AH0', 'əˈmɛɹəkə'],
  ['asleep', 'AH0 S L IY1 P', 'əˈslip'],
  ['banana', 'B AH0 N AE1 N AH0', 'bəˈnænə'],
  ['beautiful', 'B Y UW1 T AH0 F AH0 L', 'ˈbjutəfəl'],
  ['children', 'CH IH1 L D R AH0 N', 'ˈtʃɪldɹən'],
  ['chocolate', 'CH AO1 K L AH0 T', 'ˈtʃɔklət'],
  ['computer', 'K AH0 M P Y UW1 T ER0', 'kəmˈpjutɚ'],
  ['construct', 'K AH0 N S T R AH1 K T', 'kənˈstɹʌkt'],
  ['display', 'D IH0 S P L EY1', 'dɪˈspleɪ'],
  ['explain', 'IH0 K S P L EY1 N', 'ɪkˈspleɪn'],
  ['extra', 'EH1 K S T R AH0', 'ˈɛkstɹə'],
  ['hello', 'HH AH0 L OW1', 'həˈloʊ'],
  ['information', 'IH2 N F ER0 M EY1 SH AH0 N', 'ˌɪnfɚˈmeɪʃən'],
  ['judge', 'JH AH1 JH', 'ˈdʒʌdʒ'],
  ['massachusetts', 'M AE2 S AH0 CH UW1 S AH0 T S', 'ˌmæsəˈtʃusəts'],
  ['measure', 'M EH1 ZH ER0', 'ˈmɛʒɚ'],
  ['nothing', 'N AH1 TH IH0 NG', 'ˈnʌθɪŋ'],
  ['outrun', 'AW0 T R AH1 N', 'aʊˈtɹʌn'],
  ['photograph', 'F OW1 T AH0 G R AE2 F', 'ˈfoʊtəˌɡɹæf'],
  ['photography', 'F AH0 T AA1 G R AH0 F IY0', 'fəˈtɑɡɹəfi'],
  ['squirrel', 'S K W ER1 AH0 L', 'ˈskwɝəl'],
  ['strength', 'S T R EH1 NG K TH', 'ˈstɹɛŋkθ'],
  ['this', 'DH IH1 S', 'ˈðɪs'],
  ['tomato', 'T AH0 M EY1 T OW2', 'təˈmeɪˌtoʊ'],
  ['understand', 'AH2 N D ER0 S T AE1 N D', 'ˌʌndɚˈstænd'],
  ['unhappy', 'AH0 N HH AE1 P IY0', 'ənˈhæpi'],
  ['university', 'Y UW2 N AH0 V ER1 S AH0 T IY0', 'ˌjunəˈvɝsəti'],
  ['water', 'W AO1 T ER0', 'ˈwɔtɚ'],
];

describe('arpabetToIpa', () => {
  it.each(KNOWN)('%s → %s', (_word, arpabet, ipa) => {
    expect(arpabetToIpa(arpabet)).toBe(ipa);
  });

  it('rejeita fonema desconhecido e vogal sem tônica', () => {
    expect(() => arpabetToIpa('XX1')).toThrow(/desconhecido/);
    expect(() => arpabetToIpa('B AA T')).toThrow(/sem marca de tônica/);
  });
});

describe('importCmudict', () => {
  it('lê variantes, remove comentários e gera entradas válidas', () => {
    const text = [
      ';;; comentário',
      'a AH0',
      'a(2) EY1',
      'aalborg AO1 L B AO0 R G # place, danish',
      'aalborg(2) AA1 L B AO0 R G',
    ].join('\n');
    const { entries, stats } = importCmudict(text);
    expect(entries.map((e) => [e.word, e.ipa, e.rank])).toEqual([
      ['a', 'ə', 0],
      ['a', 'ˈeɪ', 1],
      ['aalborg', 'ˈɔlbɔɹɡ', 0],
      ['aalborg', 'ˈɑlbɔɹɡ', 1],
    ]);
    expect(stats).toMatchObject({ lines: 4, entries: 4, skipped: 0 });
    for (const e of entries) expect(validateEntry(e)).toEqual([]);
  });

  it('registra linhas com fonema inválido sem interromper', () => {
    const { entries, stats } = importCmudict('ok OW1 K EY1\nruim QQ1\n');
    expect(entries).toHaveLength(1);
    expect(stats.failures).toEqual([
      { line: 2, text: 'ruim QQ1', error: 'Fonema ARPAbet desconhecido: QQ1' },
    ]);
  });
});
