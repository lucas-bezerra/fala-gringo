import { describe, expect, it } from 'vitest';
import { validateEntry } from '../schema';
import { SOURCES } from '../sources';
import { importWikipron } from './wikipron';

// Linhas copiadas dos TSV oficiais (commit d282e848a211).
describe('importWikipron', () => {
  it('une os segmentos e numera as variantes da mesma palavra', () => {
    const { entries } = importWikipron('casa\tk a s a\ncasa\tk a z a\nestación\te s t a θ j o n', 'it-IT');
    expect(entries.map((e) => [e.word, e.ipa, e.rank])).toEqual([
      ['casa', 'kasa', 0],
      ['casa', 'kaza', 1],
      ['estación', 'estaθjon', 0],
    ]);
    for (const e of entries) expect(validateEntry(e)).toEqual([]);
  });

  it('mantém segmentos com diacríticos e vogais longas', () => {
    const { entries } = importWikipron('Straße\tʃ t ʁ aː s ə\nüber\tyː b ɐ', 'de-DE');
    expect(entries.map((e) => e.ipa)).toEqual(['ʃtʁaːsə', 'yːbɐ']);
  });

  it('descarta duplicatas e linhas malformadas', () => {
    const { entries, stats } = importWikipron('a\ta\na\ta\nsó-palavra\nx\ty\textra', 'fr-FR');
    expect(entries).toHaveLength(1);
    expect(stats).toEqual({ lines: 4, entries: 1, skipped: 2, duplicates: 1 });
  });

  it('declara que a fonte não traz tônica', () => {
    expect(SOURCES.wikipron.stress).toBe('no');
  });
});
