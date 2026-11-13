import { describe, expect, it } from 'vitest';
import { validateEntry } from '../schema';
import { britfoneToIpa, importBritfone } from './britfone';

// Linhas copiadas do britfone.main.3.0.1.csv (commit 1062be14adc9); IPA esperado escrito à mão (RP/SSB).
const KNOWN: [word: string, segments: string, ipa: string][] = [
  ['about', 'ə b ˈaʊ t', 'əˈbaʊt'],
  ['anew', 'ə n j ˈuː', 'əˈnjuː'],
  ['computer', 'k ə m p j ˈuː t ə', 'kəmˈpjuːtə'],
  ['explain', 'ɪ k s p l ˈeɪ n', 'ɪkˈspleɪn'],
  ['photography', 'f ə t ˈɒ g ɹ ə f i', 'fəˈtɒɡɹəfi'],
  ['schedule', 'ʃ ˈɛ dʒ uː l', 'ˈʃɛdʒuːl'],
  ['strength', 's t ɹ ˈɛ ŋ k θ', 'ˈstɹɛŋkθ'],
  ['tomato', 't ə m ˈɑː t ˌəʊ', 'təˈmɑːˌtəʊ'],
  ['university', 'j ˌuː n ɪ v ˈɜː s ɪ t i', 'ˌjuːnɪˈvɜːsɪti'],
  ['water', 'w ˈɔː t ə', 'ˈwɔːtə'],
];

describe('britfoneToIpa', () => {
  it.each(KNOWN)('%s → %s', (_word, segments, ipa) => {
    expect(britfoneToIpa(segments)).toBe(ipa);
  });

  it('rejeita segmento desconhecido e tônica em consoante', () => {
    expect(() => britfoneToIpa('x ˈa')).toThrow(/desconhecido/);
    expect(() => britfoneToIpa('ˈt ə')).toThrow(/não é vogal/);
  });
});

describe('importBritfone', () => {
  it('numera variantes, põe a palavra em minúsculas e gera entradas válidas', () => {
    const { entries, stats } = importBritfone(
      'SCHEDULE(1), ʃ ˈɛ dʒ uː l\nSCHEDULE(2), s k ˈɛ dʒ uː l\nWATER, w ˈɔː t ə\n',
    );
    expect(entries.map((e) => [e.word, e.ipa, e.rank])).toEqual([
      ['schedule', 'ˈʃɛdʒuːl', 0],
      ['schedule', 'ˈskɛdʒuːl', 1],
      ['water', 'ˈwɔːtə', 0],
    ]);
    expect(stats.failures).toEqual([]);
    for (const e of entries) expect(validateEntry(e)).toEqual([]);
  });
});
