import { describe, expect, it } from 'vitest';
import { validateEntry } from '../schema';
import { importWikidata } from './wikidata';

const HEADER = 'qid\tcode\tlabel\tipa\thuman\tplace\tclub';

describe('importWikidata', () => {
  it('importa pessoas e lugares como nomes próprios', () => {
    const text = [
      HEADER,
      'Q10287\tfr\tManuel Valls\tma.ny.ɛl vals\t1\t0\t0',
      'Q1067445\tfr\tBry\t/bʁi/\t0\t1\t0',
    ].join('\n');
    const { entries, stats } = importWikidata(text);
    expect(entries).toEqual([
      {
        word: 'Manuel Valls',
        ipa: 'ma.ny.ɛl vals',
        lang: 'fr-FR',
        source: 'wikidata',
        rank: 0,
        kind: 'proper',
      },
      { word: 'Bry', ipa: 'bʁi', lang: 'fr-FR', source: 'wikidata', rank: 0, kind: 'proper' },
    ]);
    expect(stats).toMatchObject({ rows: 2, entries: 2, otherKind: 0 });
    for (const e of entries) expect(validateEntry(e)).toEqual([]);
  });

  it('descarta itens que não são pessoa, lugar nem clube', () => {
    const { entries, stats } = importWikidata(`${HEADER}\nQ102090\tfr\tApaches\ta.paʃ\t0\t0\t0`);
    expect(entries).toEqual([]);
    expect(stats.otherKind).toBe(1);
  });

  it('espanhol: com /θ/ só es-ES; sem /θ/ vale para as duas variantes', () => {
    const text = [HEADER, 'Q1\tes\tZaragoza\tθaɾaˈɣoθa\t0\t1\t0', 'Q2\tes\tToledo\ttoˈleðo\t0\t1\t0'].join(
      '\n',
    );
    expect(importWikidata(text).entries.map((e) => `${e.word}:${e.lang}`)).toEqual([
      'Zaragoza:es-ES',
      'Toledo:es-ES',
      'Toledo:es-419',
    ]);
  });

  it('separa variantes por vírgula e numera; en sem região vira en-US', () => {
    const { entries } = importWikidata(`${HEADER}\nQ3\ten\tGreenwich\t/ˈɡɹɛnɪtʃ/, /ˈɡɹɪnɪdʒ/\t0\t1\t0`);
    expect(entries.map((e) => [e.lang, e.ipa, e.rank])).toEqual([
      ['en-US', 'ˈɡɹɛnɪtʃ', 0],
      ['en-US', 'ˈɡɹɪnɪdʒ', 1],
    ]);
  });

  it('corrige dois-pontos e hífen, e descarta IPA que não é IPA', () => {
    const text = [
      HEADER,
      'Q1\tde\tDennis Diefenbach\tˈde.nis ˈdi:.fən.bax\t1\t0\t0',
      'Q2\tfr\tSaint-Aubert\tsˈɛ̃-obˈɛʁ\t0\t1\t0',
      'Q3\tzh\t墨西哥\t墨西哥\t0\t1\t0',
    ].join('\n');
    const { entries, stats } = importWikidata(text);
    expect(entries.map((e) => e.ipa)).toEqual(['ˈde.nis ˈdiː.fən.bax', 'sˈɛ̃ obˈɛʁ']);
    expect(stats.notIpa).toBe(1);
    for (const e of entries) expect(validateEntry(e)).toEqual([]);
  });
});
