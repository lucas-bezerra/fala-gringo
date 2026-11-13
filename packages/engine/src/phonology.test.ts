import { describe, expect, it } from 'vitest';
import { createEngine } from './engine';
import { createPhonology, renderPronunciation } from './phonology';
import type { Dictionary } from './stages';
import type { Lang } from './types';

/** Exemplos da notação (docs/notacao.md, seção 7): [idioma, palavra, IPA, grafia silabada esperada]. */
const NOTATION: [Lang, string, string, string][] = [
  ['en-US', 'thank', 'θæŋk', 'THÉNK'], ['en-US', 'this', 'ðɪs', 'DHIS'], ['en-US', 'water', 'ˈwɑɾɚ', 'UA·rer'],
  ['en-US', 'please', 'pliz', 'PLIZ'], ['en-US', 'you', 'ju', 'IU'], ['en-US', 'very', 'ˈvɛɹi', 'VÉ·ri'],
  ['en-US', 'red', 'ɹɛd', 'RÉD'], ['en-US', 'house', 'haʊs', 'RAUS'], ['en-US', 'behind', 'bɪˈhaɪnd', 'bi·RRAIND'],
  ['en-US', 'city', 'ˈsɪɾi', 'SI·ri'], ['en-US', 'team', 'tim', 'TIM'], ['en-US', 'little', 'ˈlɪɾəl', 'LI·râl'],
  ['en-US', 'sing', 'sɪŋ', 'SING'], ['en-US', 'street', 'stɹit', 'STRIT'], ['en-US', 'cat', 'kæt', 'KÉT'],
  ['en-US', 'cup', 'kʌp', 'KÂP'], ['en-US', 'about', 'əˈbaʊt', 'â·BAUT'], ['en-US', 'give', 'ɡɪv', 'GUIV'],
  ['en-US', 'measure', 'ˈmɛʒɚ', 'MÉ·jer'], ['en-US', 'chocolate', 'ˈtʃɑklət', 'TCHAK·lât'], ['en-US', 'judge', 'dʒʌdʒ', 'DJÂDJ'],
  ['en-US', 'go', 'ɡoʊ', 'GÔU'], ['en-US', 'day', 'deɪ', 'DÊI'], ['en-US', 'boy', 'bɔɪ', 'BÓI'],
  ['en-US', 'woman', 'ˈwʊmən', 'U·mân'], ['en-US', 'Worcester', 'ˈwʊstɚ', 'US·ter'],
  ['en-US', 'Massachusetts', 'ˌmæsəˈtʃusɪts', 'mé·ssâ·TCHU·ssits'], ['en-US', 'welcome', 'ˈwɛlkəm', 'UÉL·kâm'],
  ['en-GB', 'water', 'ˈwɔːtə', 'UÓ·tâ'], ['en-GB', 'tomato', 'təˈmɑːtəʊ', 'tâ·MA·tôu'], ['en-GB', 'Greenwich', 'ˈɡrɛnɪtʃ', 'GRÉ·nitch'],
  ['en-GB', 'bird', 'bɜːd', 'BÂD'],
  ['es-ES', 'dónde', 'ˈdonde', 'DÔN·dê'], ['es-ES', 'estación', 'estaˈθjon', 'ês·ta·THIÔN'], ['es-419', 'estación', 'estaˈsjon', 'ês·ta·SSIÔN'],
  ['es-ES', 'perro', 'ˈpero', 'PÊ·rrô'], ['es-ES', 'jamón', 'xaˈmon', 'ra·MÔN'], ['es-ES', 'cama', 'ˈkama', 'KÁ·ma'],
  ['es-419', 'gracias', 'ˈɡɾasjas', 'GRA·ssias'], ['es-ES', 'gracias', 'ˈɡɾaθjas', 'GRA·thias'], ['es-ES', 'España', 'esˈpaɲa', 'ês·PÁ·nha'],
  ['es-ES', 'agua', 'ˈaɣwa', 'A·gua'], ['es-419', 'llamar', 'ʝaˈmaɾ', 'ia·MAR'],
  ['fr-FR', 'bonjour', 'bɔ̃ʒuʁ', 'bõ·JURR'], ['fr-FR', 'merci', 'mɛʁsi', 'mérr·SI'], ['fr-FR', 'tu', 'ty', 'TÜ'],
  ['fr-FR', 'deux', 'dø', 'DÊ'], ['fr-FR', 'peur', 'pœʁ', 'PÉRR'], ['fr-FR', 'enfant', 'ɑ̃fɑ̃', 'ã·FÃ'],
  ['fr-FR', 'rouge', 'ʁuʒ', 'RUJ'], ['fr-FR', 'Paris', 'paʁi', 'pa·RRI'],
  ['ja-JP', 'ありがとう', 'aɾiɡatoː', 'a·ri·ga·tôo'], ['ja-JP', 'ございます', 'ɡozaimasɯ̥', 'gô·zai·ma·s(u)'],
  ['ja-JP', 'ラーメン', 'ɾaːmeɴ', 'raa·mên'], ['ja-JP', '東京', 'toːkʲoː', 'tôo·kiôo'], ['ja-JP', '富士', 'ɸɯdʑi', 'fu·dji'],
  ['ja-JP', '津波', 'tsɯnami', 'tsu·na·mi'], ['ja-JP', '寿司', 'sɯɕi', 'su·chi'],
  ['ko-KR', '안녕하세요', 'annjʌŋhasejo', 'an·nióng·rra·ssê·iô'], ['ko-KR', '감사합니다', 'kamsahamnida', 'kam·sa·rram·ni·da'],
  ['ko-KR', '서울', 'sʌul', 'só·ul'], ['ko-KR', '빵', 'p͈aŋ', 'ppang'],
  ['de-DE', 'ich', 'ɪç', 'ICH'], ['de-DE', 'Bach', 'bax', 'BARR'], ['de-DE', 'über', 'ˈyːbɐ', 'Ü·bâ'],
  ['de-DE', 'Straße', 'ˈʃtʁaːsə', 'CHTRRA·ssâ'],
  ['it-IT', 'ciao', 'ˈtʃao', 'TCHAU'], ['it-IT', 'gnocchi', 'ˈɲɔkki', 'NHÓ·ki'], ['it-IT', 'grazie', 'ˈɡrattsje', 'GRA·tsiê'],
]; // prettier-ignore

/**
 * Diferenças conhecidas: o motor segue a regra adotada ou a fonte; a notação foi escrita à mão. A decisão final
 * é da T3.6 com o revisor (notação, seção 9). Mudar qualquer uma destas é decisão consciente, não acidente.
 */
const KNOWN_DIFFS: Record<string, { got: string; why: string }> = {
  chocolate: { got: 'TCHA·klât', why: 'ataque máximo do inglês (T3.4): "kl" abre sílaba' },
  Worcester: { got: 'U·ster', why: 'ataque máximo do inglês: "st" abre sílaba' },
  ciao: { got: 'TCHA·ô', why: 'a fonte registra hiato (ˈt͡ʃa.o); "tchau" é a forma aportuguesada' },
};

describe('notação, seção 7 — grafia silabada', () => {
  it.each(NOTATION)('%s %s /%s/ → %s', (lang, word, ipa, expected) => {
    const got = renderPronunciation(ipa, lang, 'dictionary', word)
      .syllables.map((s) => s.text)
      .join('·');
    expect(got).toBe(KNOWN_DIFFS[word]?.got ?? expected);
  });

  it('as diferenças conhecidas continuam sendo só estas', () => {
    expect(Object.keys(KNOWN_DIFFS)).toHaveLength(3);
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
