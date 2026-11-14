import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createEngine } from './engine';
import { createPhonology, renderPronunciation } from './phonology';
import type { Dictionary } from './stages';
import type { Lang } from './types';

/**
 * Golden set = a própria notação (docs/notacao.md, seção 7): o teste lê as tabelas, então mudar a notação muda o
 * teste. Confere a grafia silabada e as armadilhas (⚑) de cada exemplo.
 */
interface Example {
  lang: Lang;
  n: string;
  word: string;
  ipa: string;
  syllabic: string;
  traps: string[];
}

function notationExamples(): Example[] {
  const md = readFileSync(fileURLToPath(new URL('../../../docs/notacao.md', import.meta.url)), 'utf-8');
  const section = md.slice(md.indexOf('## 7.'), md.indexOf('### Decisões de 2026-11-13'));
  const HEADERS: Record<string, Lang | 'es' | 'de-it'> = {
    'Inglês (EUA)': 'en-US',
    'Inglês (Reino Unido)': 'en-GB',
    Espanhol: 'es',
    Francês: 'fr-FR',
    Japonês: 'ja-JP',
    Coreano: 'ko-KR',
    'Alemão e italiano': 'de-it',
  };
  const out: Example[] = [];
  let group: Lang | 'es' | 'de-it' | undefined;
  for (const line of section.split('\n')) {
    const h = /^### (.+)$/.exec(line);
    if (h) group = HEADERS[h[1].trim()];
    const cells = line.split('|').map((c) => c.trim());
    if (!group || !/^\d+$/.test(cells[1] ?? '')) continue;
    const [, n, word] = cells;
    const variant = group === 'es' ? cells[3] : undefined;
    const [ipa, syllabic, , flags] = group === 'es' ? cells.slice(4) : cells.slice(3);
    const traps =
      /⚑ ([A-Z_, ]+)/
        .exec(flags)?.[1]
        .split(',')
        .map((t) => t.trim()) ?? [];
    const langs: Lang[] =
      group === 'es'
        ? variant === 'ES'
          ? ['es-ES']
          : variant === '419'
            ? ['es-419']
            : ['es-ES', 'es-419']
        : group === 'de-it'
          ? [Number(n) <= 66 ? 'de-DE' : 'it-IT']
          : [group];
    for (const lang of langs) out.push({ lang, n, word, ipa, syllabic, traps });
  }
  return out;
}

const EXAMPLES = notationExamples();

describe('notação, seção 7 — golden set (grafia e armadilhas)', () => {
  it('lê os 69 exemplos da notação', () => {
    expect(new Set(EXAMPLES.map((e) => e.n)).size).toBe(69);
  });

  it.each(EXAMPLES.map((e) => [`${e.n} ${e.lang} ${e.word}`, e] as const))('%s', (_label, e) => {
    const p = renderPronunciation(e.ipa, e.lang, 'dictionary', e.word);
    expect(p.syllables.map((s) => s.text).join('·')).toBe(e.syllabic);
    expect([...p.traps].sort()).toEqual([...e.traps].sort());
  });
});

describe('renderPronunciation — destaques, armadilhas, tônica, rastreamento', () => {
  const r = (ipa: string, lang: Lang, word?: string) => renderPronunciation(ipa, lang, 'dictionary', word);

  it('destaca só os sons que não existem no PT-BR (notação 5.1)', () => {
    const th = r('θæŋk', 'en-US').syllables[0].segments;
    expect(th.map((s) => [s.text, s.special])).toEqual([
      ['th', true],
      ['é', false],
      ['n', false],
      ['k', false],
    ]);
    expect(r('ˈwɛlkəm', 'en-US').syllables[0].segments.some((s) => s.special)).toBe(false); // l final é armadilha, não destaque
  });

  it('armadilhas de posição (notação 5.3)', () => {
    expect(r('tim', 'en-US').traps).toEqual(['TI_DI', 'CODA_NASAL']);
    expect(r('pliz', 'en-US').traps).toEqual(['FINAL_Z']);
    expect(r('ˈʃtʁaːsə', 'de-DE').traps).toEqual(['S_CLUSTER']);
    expect(r('ʝaˈmaɾ', 'es-419').traps).toEqual(['CODA_R']);
    expect(r('ɾaːmeɴ', 'ja-JP').traps).toEqual(['INITIAL_TAP', 'CODA_NASAL']);
  });

  it('tônica: maiúsculas só na primária; japonês sem tônica; regra quando a fonte não marca', () => {
    expect(r('təˈmeɪˌtoʊ', 'en-US').syllables.map((s) => s.text)).toEqual(['tâ', 'MÊI', 'tôu']);
    expect(r('aɾiɡatoː', 'ja-JP').stress).toBe('none');
    const es = renderPronunciation('estasjon', 'es-419', 'none', 'estación');
    expect(es.stress).toBe('rule');
    expect(es.syllables.map((s) => s.text).join('·')).toBe('ês·ta·SSIÔN');
  });

  it('flap do inglês americano (perfil): t entre vogais em sílaba átona', () => {
    expect(
      r('ˈwɔtɚ', 'en-US')
        .syllables.map((s) => s.text)
        .join('·'),
    ).toBe('UÓ·rer'); // CMUdict: water
    expect(
      r('əˈtæk', 'en-US')
        .syllables.map((s) => s.text)
        .join('·'),
    ).toBe('â·TÉK'); // sílaba tônica: sem flap
  });

  it('nome com várias palavras marca o início de cada uma', () => {
    const p = r('ma.ny.ɛl vals', 'fr-FR');
    expect(p.syllables.map((s) => `${s.wordStart ? '|' : ''}${s.text}`)).toEqual(['ma', 'nü', 'ÉL', '|VALS']);
  });
});

describe('motor completo com a fonologia real', () => {
  it('converte uma frase e monta a leitura silabada e corrida', async () => {
    const words: Record<string, string> = { thank: 'ˈθæŋk', you: 'ˈju', 'manuel valls': 'ma.ny.ɛl ˈvals' };
    const dictionary: Dictionary = {
      lookup: async (_l, key) =>
        words[key]
          ? {
              display: key,
              proper: false,
              prons: [{ ipa: words[key], stress: 'dictionary', source: 'cmudict', agree: 0 }],
            }
          : undefined,
    };
    const engine = createEngine({ dictionary, phonology: createPhonology() });
    const result = await engine.convert('Thank you!', 'en-US');
    expect(result.reading).toEqual({ syllabic: 'THÉNK IU!', flat: 'THÉNK IU!' });
    expect(result.traps).toEqual(['FINAL_CONS']);
  });
});

describe('correções achadas no teste com frases reais', () => {
  const sy = (ipa: string, lang: Lang, word?: string, stress: 'dictionary' | 'none' = 'dictionary') =>
    renderPronunciation(ipa, lang, stress, word)
      .syllables.map((s) => s.text)
      .join('·');
  it('inglês americano: sem flap antes de "n" silábico (Biden, button); com flap antes de l (little)', () => {
    expect(sy('ˈbaɪdən', 'en-US')).toBe('BAI·dân');
    expect(sy('ˈbʌtən', 'en-US')).toBe('BÂ·tân');
    expect(sy('ˈlɪtəl', 'en-US')).toBe('LI·râl');
  });
  it('espanhol: ditongo decrescente escrito com vogal (Aires) é uma sílaba', () => {
    expect(sy('aiɾes', 'es-419', 'Aires', 'none')).toBe('AI·rês');
  });
});

describe('R11, 2ª parte — monossílabo funcional em frase', () => {
  const words: Record<string, string> = { the: 'ðə', guardian: 'ˈɡɑːdi.ən', of: 'ˈɒv', bank: 'ˈbæŋk' };
  const dictionary: Dictionary = {
    lookup: async (_l, key) =>
      words[key]
        ? {
            display: key,
            proper: false,
            prons: [{ ipa: words[key], stress: 'dictionary', source: 'wiktextract', agree: 0 }],
          }
        : undefined,
  };
  const engine = createEngine({ dictionary });
  it('em frase, minúsculas; sozinho, tônico', async () => {
    expect((await engine.convert('The Guardian', 'en-GB')).reading.syllabic).toBe('dhâ GA·di·ân');
    expect((await engine.convert('Bank of', 'en-GB')).reading.syllabic).toBe('BÉNK óv');
    expect((await engine.convert('the', 'en-GB')).reading.syllabic).toBe('DHÂ');
  });
});
