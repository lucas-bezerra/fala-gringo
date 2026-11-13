import { describe, expect, it } from 'vitest';
import type { RawToken } from './stages';
import { createTokenizer, normalizeForLookup } from './tokenizer';
import type { Lang } from './types';

const tok = createTokenizer();
/** Forma compacta: palavras como [texto], números como #n, pontuação entre aspas; espaços omitidos. */
const show = (text: string, lang: Lang) =>
  tok
    .tokenize(text, lang)
    .filter((t) => !(t.kind === 'text' && t.reason === 'space'))
    .map((t) =>
      t.kind === 'word' ? `[${t.text}]` : t.reason === 'number' ? `#${t.text}` : JSON.stringify(t.text),
    );
const word = (text: string, lang: Lang, at: string) =>
  tok
    .tokenize(text, lang)
    .find((t): t is Extract<RawToken, { kind: 'word' }> => t.kind === 'word' && t.text === at)!;
const partsOf = (t: Extract<RawToken, { kind: 'word' }>) =>
  t.parts?.map((p) => (p.kind === 'word' ? `[${p.text}]` : p.text));

describe('normalizeForLookup', () => {
  it('unifica apóstrofos e hífens tipográficos', () => {
    expect(normalizeForLookup('didn’t')).toBe("didn't");
    expect(normalizeForLookup('L‘école')).toBe("L'école");
    expect(normalizeForLookup('well‐known')).toBe('well-known');
  });
});

describe('createTokenizer', () => {
  it('inglês: contrações, possessivos, compostos e números', () => {
    expect(show('I didn’t know John’s well-known café, 1st in 1998 (3.14%).', 'en-US')).toEqual([
      '[I]', '[didn’t]', '[know]', '[John’s]', '[well-known]', '[café]', '","', '#1st', '[in]', '#1998', '"("', '#3.14', '"%"', '")"', '"."',
    ]); // prettier-ignore
    const didnt = word('I didn’t', 'en-US', 'didn’t');
    expect(didnt.norm).toBe("didn't");
    expect(partsOf(didnt)).toEqual(['[did]', '[n’t]']);
    expect(partsOf(word('John’s', 'en-US', 'John’s'))).toEqual(['[John]', '[’s]']);
    expect(partsOf(word('a well-known one', 'en-US', 'well-known'))).toEqual(['[well]', '-', '[known]']);
  });

  it('inglês: apóstrofos nas pontas grudam na palavra', () => {
    expect(show("'bout goin' home", 'en-US')).toEqual(["['bout]", "[goin']", '[home]']);
    expect(partsOf(word("'bout", 'en-US', "'bout"))).toEqual(["'", '[bout]']);
  });

  it('francês e italiano: elisão com partes de reserva', () => {
    const fr = 'L’école d’aujourd’hui, Saint-Aubert-sur-Mer.';
    expect(show(fr, 'fr-FR')).toEqual([
      '[L’école]',
      '[d’aujourd’hui]',
      '","',
      '[Saint-Aubert-sur-Mer]',
      '"."',
    ]);
    expect(partsOf(word(fr, 'fr-FR', 'L’école'))).toEqual(['[L’]', '[école]']);
    expect(partsOf(word(fr, 'fr-FR', 'd’aujourd’hui'))).toEqual(['[d’]', '[aujourd’hui]']); // só no 1º apóstrofo
    expect(partsOf(word(fr, 'fr-FR', 'Saint-Aubert-sur-Mer'))).toEqual([
      '[Saint]',
      '-',
      '[Aubert]',
      '-',
      '[sur]',
      '-',
      '[Mer]',
    ]);
    expect(partsOf(word("dell'anno", 'it-IT', "dell'anno"))).toEqual(["[dell']", '[anno]']);
  });

  it('marca maiúscula e início de frase', () => {
    const toks = tok.tokenize('Correspondentes em Worcester. Depois, «Paris» e 2 dias.', 'en-US');
    const flags = Object.fromEntries(
      toks
        .filter((t) => t.kind === 'word')
        .map((t) => [t.text, `${t.capitalized ? 'M' : 'm'}${t.sentenceStart ? 'I' : '-'}`]),
    );
    expect(flags).toEqual({
      Correspondentes: 'MI',
      em: 'm-',
      Worcester: 'M-',
      Depois: 'MI',
      Paris: 'M-',
      e: 'm-',
      dias: 'm-',
    });
  });

  it('chinês e japonês sem espaços viram várias palavras', () => {
    expect(show('我喜欢北京烤鸭', 'zh-CN')).toEqual(['[我]', '[喜欢]', '[北京]', '[烤鸭]']);
    const ja = show('ありがとうございます。東京へ行きます', 'ja-JP');
    expect(ja.length).toBeGreaterThan(4);
    expect(ja).toContain('[ありがとう]');
    expect(ja).toContain('[東京]');
  });

  it('coreano separa por espaço', () => {
    expect(show('안녕하세요, 감사합니다', 'ko-KR')).toEqual(['[안녕하세요]', '","', '[감사합니다]']);
  });
});
