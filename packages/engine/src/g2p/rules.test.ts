import { describe, expect, it } from 'vitest';
import { createEngine, placeholderPhonology } from '../engine';
import { renderPronunciation } from '../phonology';
import type { Dictionary } from '../stages';
import type { Lang } from '../types';
import { frenchToIpa } from './french';
import { italianToIpa } from './italian';
import { joinJapanese, kanaToIpa, normalizeJapaneseIpa, preferJapanese } from './japanese';
import { koreanToIpa } from './korean';
import { chainEstimators, createRuleEstimator, ruleToIpa } from './rules';
import { spanishToIpa } from './spanish';

/** Grafia que a tela mostraria para a estimativa. */
const reading = (word: string, lang: Lang) => {
  const ipa = ruleToIpa(word, lang)!;
  return renderPronunciation(ipa, lang, 'none', word)
    .syllables.map((s) => s.text)
    .join('·');
};

describe('espanhol por regras (T5.1)', () => {
  it.each([
    ['quieres', 'es-ES', 'kjeɾes'],
    ['de', 'es-ES', 'de'],
    ['cerveza', 'es-ES', 'θeɾbeθa'],
    ['cerveza', 'es-419', 'seɾbesa'],
    ['guitarra', 'es-ES', 'ɡitara'],
    ['pingüino', 'es-ES', 'pinɡwino'],
    ['llamar', 'es-419', 'ʝamaɾ'],
    ['hoy', 'es-ES', 'oi'],
    ['ahora', 'es-ES', 'aoɾa'],
    ['jamón', 'es-ES', 'xamon'],
    ['actuar', 'es-ES', 'aɡtwaɾ'],
    ['acre', 'es-ES', 'akɾe'],
    ['examen', 'es-ES', 'eɡsamen'],
    ['país', 'es-ES', 'pa.is'],
    ['enviar', 'es-ES', 'embjaɾ'],
  ] as const)('%s (%s) → %s', (word, lang, ipa) => expect(spanishToIpa(word, lang)).toBe(ipa));

  it('a tônica vem da regra ortográfica do motor', () => {
    expect(reading('quieres', 'es-ES')).toBe('KIÊ·rês');
    expect(reading('jamón', 'es-ES')).toBe('ra·MÔN');
    expect(reading('Sánchez', 'es-ES')).toBe('SAN·tchêth');
    expect(reading('país', 'es-ES')).toBe('pa·IS');
  });

  it('recusa o que não é espanhol', () => {
    expect(spanishToIpa('r2d2', 'es-ES')).toBeUndefined();
    expect(spanishToIpa('москва', 'es-ES')).toBeUndefined();
  });
});

describe('italiano por regras (T5.2)', () => {
  it.each([
    ['ciao', 't͡ʃao'],
    ['giorno', 'd͡ʒorno'],
    ['gnocchi', 'ɲokki'],
    ['famiglia', 'famiʎʎa'],
    ['gli', 'ʎi'],
    ['scienza', 'ʃent͡sa'],
    ['acqua', 'akkwa'],
    ['grazie', 'ɡratt͡sje'],
    ['città', 't͡ʃittˈa'],
    ['perché', 'perkˈe'],
    ['organizzare', 'orɡaniddzare'.replace('ddz', 'dd͡z')],
    ['fotografia', 'fotoɡrafˈia'],
  ])('%s → %s', (word, ipa) => expect(italianToIpa(word)).toBe(ipa));

  it('grafia na tela: paroxítona por padrão, acento gráfico manda', () => {
    expect(reading('Mattarella', 'it-IT')).toBe('ma·ta·RÊ·la');
    expect(reading('però', 'it-IT')).toBe('pê·RÓ');
    expect(reading('Draghi', 'it-IT')).toBe('DRA·gui');
  });
});

describe('escolha de variante (prefer)', () => {
  const rules = createRuleEstimator();

  it('escolhe a variante do dicionário mais próxima do padrão', () => {
    expect(rules.prefer?.('la', 'es-ES', ['a', 'la'])).toBe(1);
    expect(rules.prefer?.('por', 'es-ES', ['po', 'poɾ'])).toBe(1);
    expect(rules.prefer?.('casa', 'es-ES', ['kasa', 'kaha'])).toBe(0);
  });

  it('sem regras para o idioma ou com uma só variante, não interfere', () => {
    expect(rules.prefer?.('water', 'en-US', ['ˈwɔtɚ', 'ˈwɑtɚ'])).toBeUndefined();
    expect(rules.prefer?.('la', 'es-ES', ['a'])).toBeUndefined();
  });

  it('o motor usa a variante escolhida como principal e mantém as outras', async () => {
    const dictionary: Dictionary = {
      lookup: async (_lang, key) =>
        key === 'la'
          ? {
              display: 'la',
              proper: false,
              prons: [
                { ipa: 'a', stress: 'none', source: 'wikipron', agree: 0 },
                { ipa: 'la', stress: 'none', source: 'wikipron', agree: 0 },
              ],
            }
          : undefined,
    };
    const engine = createEngine({ dictionary, phonology: placeholderPhonology, estimator: rules });
    const [t] = (await engine.convert('la', 'es-ES')).tokens;
    expect(t.kind === 'word' && [t.primary.ipa, t.variants.map((v) => v.ipa)]).toEqual(['la', ['a']]);
  });

  it('encadeia: regras primeiro, depois o próximo estimador', async () => {
    const next = { estimate: async (k: string) => (k === 'zelensky' ? 'zɪˈlɛnski' : undefined) };
    const chain = chainEstimators(rules, undefined, next);
    expect(await chain.estimate('quieres', 'es-ES')).toBe('kjeɾes');
    expect(await chain.estimate('zelensky', 'en-US')).toBe('zɪˈlɛnski');
    expect(await chain.estimate('qwxz', 'en-US')).toBeUndefined();
    expect(chain.prefer?.('la', 'es-ES', ['a', 'la'])).toBe(1);
  });
});

describe('francês: regras para escolher a variante (T5.4)', () => {
  const rules = createRuleEstimator();

  it.each([
    ['de', 'də'],
    ['je', 'ʒə'],
    ['être', 'ɛtʁ'],
    ['quand', 'kɑ̃'],
    ['bon', 'bɔ̃'],
    ['bonne', 'bɔn'],
    ['une', 'yn'],
    ['elle', 'ɛl'],
    ['petit', 'pəti'],
    ['parler', 'paʁle'],
    ['nation', 'nasjɔ̃'],
    ['château', 'ʃato'],
    ['avaient', 'avɛ'],
  ])('%s → %s', (word, ipa) => expect(frenchToIpa(word)).toBe(ipa));

  it('troca a forma reduzida/liaison da 1ª posição pela forma de citação', () => {
    expect(rules.prefer?.('de', 'fr-FR', ['dam', 'dø', 'də'])).toBe(2);
    expect(rules.prefer?.('bon', 'fr-FR', ['bɔn‿', 'bɔ̃'])).toBe(1);
    expect(rules.prefer?.('être', 'fr-FR', ['dɛt', 'ɛtrə', 'ɛtʁ', 'ɛːtʁ'])).toBe(2);
  });

  it('no francês as regras só escolhem a variante: quem estima é o modelo G2P', async () => {
    expect(await rules.estimate('zorglub', 'fr-FR')).toBeUndefined();
  });

  it('no italiano a 1ª variante do Wiktionary é mantida', () => {
    expect(rules.prefer?.('casa', 'it-IT', ['ˈka.sa', 'ˈka.za'])).toBeUndefined();
  });
});

describe('coreano: Hangul por regras (T5.6)', () => {
  it.each([
    ['있어요', 'is͈ʌjo'], // ligação + ㅆ
    ['국물', 'kuŋmul'], // nasalização
    ['신라', 'ɕʰilla'], // liquidização
    ['학교', 'hakk͈jo'], // tensificação
    ['좋다', 't͡ɕotʰa'], // ㅎ + ㄷ → ㅌ
    ['축하', 't͡ɕʰukʰa'], // ㄱ + ㅎ → ㅋ
    ['굳이', 'kud͡ʑi'], // palatalização
    ['침략', 't͡ɕʰimnjak'], // ㄹ → ㄴ depois de ㅁ
    ['닭', 'tak'], // coda dupla
    ['닮은', 'talmɯn'], // coda dupla + ligação
    ['건설하다', 'kʌnsʰʌɾhada'], // ㄹ + ㅎ
    ['의사', 'ɰisʰa'],
    ['희망', 'himaŋ'],
  ])('%s → %s', (word, ipa) => expect(koreanToIpa(word)).toBe(ipa));

  it('grafia na tela, sem tônica (minúsculas)', () => {
    expect(reading('어떻게', 'ko-KR')).toBe('ó·ttó·kê');
    expect(reading('감사합니다', 'ko-KR')).toBe('kam·sa·rram·ni·da');
  });

  it('só Hangul completo', () => {
    expect(koreanToIpa('ㅋㅋ')).toBeUndefined();
    expect(koreanToIpa('abc')).toBeUndefined();
  });
});

describe('japonês: kana por regras e leituras (T5.5)', () => {
  it.each([
    ['ありがとう', 'aɾiɡatoː'], // おう → oː
    ['ございます', 'ɡozaimasɯ̥'], // -su final desvozeado
    ['こんにちは', 'koɴnitɕiɰᵝa'], // は cristalizado = wa
    ['ラーメン', 'ɾaːmeɴ'], // katakana + ー
    ['コーヒー', 'koːçiː'],
    ['ちょっと', 'tɕotːo'], // dígrafo + っ
    ['がっこう', 'ɡakːoː'],
    ['ティッシュ', 'tiɕːɯ'], // katakana estendido
    ['ファン', 'ɸaɴ'],
    ['おおきい', 'oːkiː'], // vogal repetida = longa
    ['は', 'ɰᵝa'], // partículas
    ['を', 'o'],
    ['へ', 'e'],
  ])('%s → %s', (word, ipa) => expect(kanaToIpa(word)).toBe(ipa));

  it('kanji fica para o dicionário', () => {
    expect(kanaToIpa('東京')).toBeUndefined();
    expect(ruleToIpa('行き', 'ja-JP')).toBeUndefined();
    expect(ruleToIpa('ありがとう', 'ja-JP')).toBe('aɾiɡatoː');
  });

  it('normaliza o IPA do dicionário (vogal longa, -su final), sem mexer no -u de verbo', () => {
    expect(normalizeJapaneseIpa('toɯkjoɯ', '東京')).toBe('toːkjoː');
    expect(normalizeJapaneseIpa('ɡakːoɯ', '学校')).toBe('ɡakːoː');
    expect(normalizeJapaneseIpa('oosaka', '大阪')).toBe('oːsaka');
    expect(normalizeJapaneseIpa('desɯ', 'です')).toBe('desɯ̥');
    expect(normalizeJapaneseIpa('omoɯ', '思う')).toBe('omoɯ');
    expect(normalizeJapaneseIpa('sɯɕi', '寿司')).toBe('sɯɕi'); // notação, exemplo 58
    expect(normalizeJapaneseIpa('ha', 'は')).toBe('ɰᵝa');
    const once = normalizeJapaneseIpa('toɯkjoɯ', '東京');
    expect(normalizeJapaneseIpa(once, '東京')).toBe(once);
  });

  it('escolhe a leitura principal das palavras comuns', () => {
    expect(preferJapanese('私', ['atai', 'ɰᵝatai', 'ɰᵝataɕi'])).toBe(2);
    expect(preferJapanese('学生', ['ɡakɯɕoɯ', 'ɡakɯsei', 'ɡakɯsoɯ'])).toBe(1);
    expect(preferJapanese('水', ['sɯi', 'mi', 'mizɯ'])).toBe(2);
    expect(preferJapanese('東京', ['toɯkjoɯ'])).toBeUndefined(); // fora da lista
    expect(createRuleEstimator().prefer!('人', 'ja-JP', ['dʑiɴ', 'taɾi', 'çito'])).toBe(2);
  });

  it.each([
    [['ありがとう', 'ご', 'ざ', 'い', 'ます'], 'ありがとう|ございます'],
    [['何', 'を', 'し', 'てい', 'ます', 'か'], '何|を|しています|か'],
    [['勉強', 'し', 'てい', 'ます'], '勉強|し|ています'], // し depois de kanji é a terminação dele
    [['待', 'って', 'くだ', 'さい'], '待|って|ください'],
    [['いらっしゃい', 'ま', 'せ'], 'いらっしゃいませ'],
    [['行き', 'ま', 'しょう'], '行き|ましょう'],
    [['ごちそうさま', 'で', 'した'], 'ごちそうさま|でした'],
    [['駅', 'は', 'どこ', 'です', 'か'], '駅|は|どこ|です|か'], // partícula e cópula soltas
  ])('segmenta %j', (chunks, groups) =>
    expect(
      joinJapanese(chunks)
        .map((g) => g.join(''))
        .join('|'),
    ).toBe(groups),
  );

  it('frase de ponta a ponta: dicionário (kanji, leitura curada), kana estimado, palavras separadas na leitura', async () => {
    const prons = (...ipas: string[]) =>
      ipas.map((ipa) => ({ ipa, stress: 'none' as const, source: 'ipa-dict' as const, agree: 0 }));
    const data: Record<string, string[]> = {
      私: ['atai', 'ɰᵝataɕi'],
      は: ['ha'],
      学生: ['ɡakɯɕoɯ', 'ɡakɯsei'],
      です: ['desɯ'],
    };
    const dictionary: Dictionary = {
      lookup: async (_lang, key) =>
        data[key] ? { display: key, proper: false, prons: prons(...data[key]) } : undefined,
    };
    const engine = createEngine({ dictionary, estimator: createRuleEstimator() });
    const r = await engine.convert('私は学生です。ありがとうございます', 'ja-JP');
    expect(r.reading.syllabic).toBe('ua·ta·chi ua ga·ku·ssêi dê·s(u)。a·ri·ga·tôo gô·zai·ma·s(u)');
    const origins = r.tokens.flatMap((t) => (t.kind === 'word' ? [`${t.original}:${t.origin}`] : []));
    expect(origins).toEqual([
      '私:dictionary',
      'は:dictionary',
      '学生:dictionary',
      'です:dictionary',
      'ありがとう:estimated',
      'ございます:estimated',
    ]);
  });
});
