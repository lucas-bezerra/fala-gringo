/**
 * Japonês (T5.5): kana → IPA por regras, normalização do IPA do dicionário e escolha da leitura principal.
 *
 * A fonte (EDICT via ipa-dict) quase só tem palavras em kanji e foi convertida do romaji mecanicamente: não marca
 * vogal longa (東京 → toɯkjoɯ, 中 → tɕɯɯ), nem desvozeamento (です → desɯ), e lista as leituras de um kanji sem
 * ordem de uso (私 → atai antes de ɰᵝataɕi; 水 → sɯi antes de mizɯ). Kana é fonético, então hiragana e katakana
 * viram IPA por regra (ありがとう, ございます, que a fonte não tem), no mesmo estilo da fonte: ɯ, ɕ, t͡ɕ, ts, ç, ɸ,
 * ɰᵝ, ɴ, geminada como Cː. O acento de altura (pitch) fica de fora: a fonte não o traz.
 */

const KATA_OFFSET = 0x60;

/** Katakana → hiragana (mesma tabela); ー e símbolos ficam. */
const toHiragana = (s: string) =>
  [...s]
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      return cp >= 0x30a1 && cp <= 0x30f6 ? String.fromCodePoint(cp - KATA_OFFSET) : ch;
    })
    .join('');

/** Só kana (hiragana, katakana, ー, ゝゞ). */
export const isKana = (s: string) => /^[ぁ-ゖゝゞァ-ヺーヽヾ]+$/u.test(s);
const isHiragana = (s: string) => /^[ぁ-ゖゝゞ]+$/u.test(s);
/** Partículas que, sozinhas, têm leitura própria (は → wa) e não devem ser coladas aos vizinhos. */
export const JA_PARTICLES = new Set([
  'は',
  'が',
  'を',
  'に',
  'へ',
  'で',
  'と',
  'も',
  'の',
  'や',
  'か',
  'ね',
  'よ',
]);
/** Palavras em kana com a partícula は (wa) cristalizada no fim. */
const WA_ENDING = new Set([
  'こんにちは',
  'こんばんは',
  'では',
  'には',
  'とは',
  'それでは',
  'これでは',
  'じゃあね',
]);

/** Mora básica (vogal, ou consoante + vogal). */
const BASE: Record<string, string> = {
  あ: 'a', い: 'i', う: 'ɯ', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'kɯ', け: 'ke', こ: 'ko', が: 'ɡa', ぎ: 'ɡi', ぐ: 'ɡɯ', げ: 'ɡe', ご: 'ɡo',
  さ: 'sa', し: 'ɕi', す: 'sɯ', せ: 'se', そ: 'so', ざ: 'za', じ: 'dʑi', ず: 'zɯ', ぜ: 'ze', ぞ: 'zo',
  た: 'ta', ち: 'tɕi', つ: 'tsɯ', て: 'te', と: 'to', だ: 'da', ぢ: 'dʑi', づ: 'zɯ', で: 'de', ど: 'do',
  な: 'na', に: 'ni', ぬ: 'nɯ', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'çi', ふ: 'ɸɯ', へ: 'he', ほ: 'ho', ば: 'ba', び: 'bi', ぶ: 'bɯ', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pɯ', ぺ: 'pe', ぽ: 'po',
  ま: 'ma', み: 'mi', む: 'mɯ', め: 'me', も: 'mo', や: 'ja', ゆ: 'jɯ', よ: 'jo',
  ら: 'ɾa', り: 'ɾi', る: 'ɾɯ', れ: 'ɾe', ろ: 'ɾo', わ: 'ɰᵝa', ゐ: 'i', ゑ: 'e', を: 'o', ゔ: 'bɯ',
  ぁ: 'a', ぃ: 'i', ぅ: 'ɯ', ぇ: 'e', ぉ: 'o', ゎ: 'ɰᵝa',
}; // prettier-ignore

/** Consoante "palatalizada" das moras em -i, para os dígrafos com ゃゅょ (きゃ → kja, しゃ → ɕa). */
const PALATAL: Record<string, string> = {
  き: 'kj', ぎ: 'ɡj', し: 'ɕ', じ: 'dʑ', ち: 'tɕ', ぢ: 'dʑ', に: 'nj', ひ: 'çj', び: 'bj', ぴ: 'pj', み: 'mj', り: 'ɾj', て: 'tj', で: 'dj',
}; // prettier-ignore
const SMALL_Y: Record<string, string> = { ゃ: 'a', ゅ: 'ɯ', ょ: 'o' };
/** Katakana estendido (empréstimos): consoante + vogal pequena (ファ, ティ, シェ…). */
const SMALL_V: Record<string, string> = { ぁ: 'a', ぃ: 'i', ぅ: 'ɯ', ぇ: 'e', ぉ: 'o' };
const EXTENDED_C: Record<string, string> = {
  ふ: 'ɸ', て: 't', で: 'd', と: 't', ど: 'd', う: 'ɰᵝ', し: 'ɕ', じ: 'dʑ', ち: 'tɕ', つ: 'ts', ゔ: 'b',
}; // prettier-ignore

/** Ataque de uma mora: africada (dois símbolos) ou uma consoante. */
const ONSET = /^(tɕ|dʑ|ts|ɰᵝ|[^aiɯeo])/u;

/**
 * Desvozeamento (notação: `(u)`/`(i)`): só o -ɯ final depois de s, o caso que todo falante faz (です → desɯ̥,
 * ございます → ɡozaimasɯ̥). No meio da palavra ele varia (寿司 fica su·chi na notação, exemplo 58), então não é
 * aplicado: o IPA da fonte não o marca.
 */
export function devoice(ipa: string): string {
  return ipa.replace(/sɯ$/u, 'sɯ\u0325');
}

/** Vogal longa: vogal repetida → Vː (大阪 oosaka → oːsaka, 中 tɕɯɯ → tɕɯː); えい fica (pronúncia de leitura). */
const lengthen = (ipa: string) => ipa.replace(/([aiɯeo])\1/gu, '$1ː');

/** Kana → IPA; `undefined` se houver algo além de kana. */
export function kanaToIpa(word: string): string | undefined {
  const w = word.normalize('NFC');
  if (!isKana(w)) return undefined;
  if (w === 'は') return 'ɰᵝa'; // partícula
  if (w === 'へ') return 'e';
  if (w === 'を') return 'o';
  const wa = WA_ENDING.has(w);
  const h = toHiragana(wa ? w.slice(0, -1) : w);
  let out = '';
  let geminate = false;
  let lastVowel = '';
  for (let i = 0; i < h.length; i++) {
    const ch = h[i];
    const next = h[i + 1] ?? '';
    let mora: string;
    if (ch === 'っ') {
      geminate = true;
      continue;
    } else if (ch === 'ん') {
      mora = 'ɴ';
    } else if (ch === 'ー') {
      if (lastVowel) out += 'ː';
      continue;
    } else if (SMALL_Y[next] && PALATAL[ch]) {
      mora = PALATAL[ch] + SMALL_Y[next];
      i++;
    } else if (SMALL_V[next] && EXTENDED_C[ch] && (ch !== 'う' || next !== 'ぅ')) {
      mora = EXTENDED_C[ch] + SMALL_V[next];
      i++;
    } else if (BASE[ch]) {
      mora = BASE[ch];
    } else continue; // ゝゞ e afins: ignorados
    if (geminate) {
      // っ: a consoante seguinte fica longa, no estilo da fonte (ɕːi, tːe)
      const m = ONSET.exec(mora);
      if (m && m[1] !== 'ɴ') mora = `${m[1]}ː${mora.slice(m[1].length)}`;
      geminate = false;
    }
    // vogal longa: おう → oː (ありがとう, おはよう)
    if (mora === 'ɯ' && lastVowel === 'o') {
      out += 'ː';
      lastVowel = '';
      continue;
    }
    out += mora;
    lastVowel = /[aiɯeo]$/u.test(mora) ? mora.slice(-1) : '';
  }
  if (wa) out += 'ɰᵝa';
  return out ? devoice(lengthen(out)) : undefined;
}

/**
 * IPA do dicionário → mesmo padrão das regras: oɯ → oː (東京 → toːkjoː; menos no -う final de verbo escrito com
 * kanji, como 思う), vogal repetida → longa, desvozeamento. A partícula は sozinha é "wa". Idempotente.
 */
export function normalizeJapaneseIpa(ipa: string, word = ''): string {
  if (word === 'は') return 'ɰᵝa';
  if (word === 'へ') return 'e';
  const verbEnding = /[一-鿿々]/u.test(word) && /う$/u.test(word);
  let s = ipa.replace(/oɯ(?!$)/gu, 'oː');
  if (!verbEnding) s = s.replace(/oɯ$/u, 'oː');
  return devoice(lengthen(s));
}

const HAS_KANJI = /[\u3400-\u9fff々]/u;
/** Terminações verbais que o ICU separa e que sempre colam no hiragana anterior (行き|ま|しょう, くだ|さい). */
const ENDINGS = new Set([
  'ます',
  'ました',
  'ません',
  'ましょう',
  'ませ',
  'ま',
  'せ',
  'した',
  'しょう',
  'さい',
]);
/** Palavras que nunca colam no anterior (どこ|です fica どこ + です). */
const STANDALONE = new Set(['です', 'だ', 'でした', 'でしょう']);

/**
 * Segmentação do japonês (T5.5) sobre os pedaços do ICU, que quebra o que não conhece em kana soltos
 * (ありがとう|ご|ざ|い|ます). Junta hiragana com hiragana quando:
 *   - o 2º é uma terminação verbal (ます, ました, しょう, さい…): くだ|さい → ください, お願い|し|ます → し + ます;
 *   - o 1º é um fragmento: pedaço curto (< 3 kana) que não vem logo depois de kanji (aí é a terminação do kanji,
 *     como って em 待|って), ou um pedaço já juntado. ご|ざ|い → ござい.
 * Partículas (は, を, か…) e a cópula (です, だ) ficam soltas, menos で + した/しょう (でした, でしょう). Palavras que o ICU reconheceu
 * inteiras (ありがとう, すごい) não recebem o vizinho.
 *
 * Recebe os textos dos pedaços de palavra vizinhos (sem espaço nem pontuação entre eles) e devolve os grupos.
 */
export function joinJapanese(chunks: readonly string[]): string[][] {
  const groups: string[][] = [];
  let glue = false; // o último grupo aceita continuação
  chunks.forEach((t, i) => {
    const last = groups[groups.length - 1];
    const prev = last?.join('');
    const join =
      prev !== undefined &&
      isHiragana(prev) &&
      isHiragana(t) &&
      ((prev === 'で' && (t === 'した' || t === 'しょう')) ||
        (!JA_PARTICLES.has(prev) && !JA_PARTICLES.has(t) && !STANDALONE.has(t) && (ENDINGS.has(t) || glue)));
    if (join) {
      last.push(t);
      glue = true;
      return;
    }
    groups.push([t]);
    const afterKanji = i > 0 && HAS_KANJI.test(chunks[i - 1]);
    glue = isHiragana(t) && !JA_PARTICLES.has(t) && [...t].length < 3 && !afterKanji;
  });
  return groups;
}

/**
 * Leitura principal das palavras comuns com várias leituras na fonte (forma isolada mais usada). Sem lista de
 * frequência do japonês com licença aberta, a lista é curada; o gabarito (golden/ja-JP.tsv) a confere.
 */
const PREFERRED: Record<string, string> = {
  私: 'ɰᵝataɕi', 日本: 'nihoɴ', 日本語: 'nihoɴɡo', 日本人: 'nihoɴdʑiɴ', 今日: 'kjoɯ', 明日: 'aɕita',
  昨日: 'kinoɯ', 人: 'çito', 何: 'nani', 今: 'ima', 方: 'kata', 一人: 'çitoɾi', 二人: 'ɸɯtaɾi',
  大人: 'otona', 先生: 'seɴsei', 学生: 'ɡakɯsei', 水: 'mizɯ', 山: 'jama', 川: 'kaɰᵝa', 中: 'naka',
  上: 'ɯe', 下: 'ɕita', 年: 'toɕi', 月: 'tsɯki', 日: 'çi', 本: 'hoɴ', 円: 'eɴ', 行く: 'ikɯ', 来る: 'kɯɾɯ',
  見: 'mi', 僕: 'bokɯ', 君: 'kimi', 彼: 'kaɾe', 誰: 'daɾe', 時: 'toki', 間: 'aida', 前: 'mae', 後: 'ato',
  女: 'oɴna', 男: 'otoko', 家: 'ie', 金: 'kane', 気: 'ki', 目: 'me', 口: 'kɯtɕi', 道: 'mitɕi', 事: 'koto',
  物: 'mono', 者: 'mono', 所: 'tokoɾo', 東: 'çiɡaɕi', 西: 'niɕi', 車: 'kɯɾɯma', 言う: 'iɯ', 大丈夫: 'daidʑoɯbɯ',
  本当: 'hoɴtoɯ', 一: 'itɕi', 二: 'ni', 三: 'saɴ', 十: 'dʑɯɯ', 百: 'çjakɯ', 千: 'seɴ', 万: 'maɴ',
  大阪: 'oosaka', 外国: 'ɡaikokɯ', 猫: 'neko', 小: 'ɕoɯ', 大: 'dai', 生: 'sei', 行き: 'iki', 好き: 'sɯki',
  今年: 'kotoɕi', 今朝: 'kesa', 一日: 'itɕinitɕi', 一つ: 'çitotsɯ', 二つ: 'ɸɯtatsɯ', 下手: 'heta', 上手: 'dʑoɯzɯ',
  友達: 'tomodatɕi', 空: 'soɾa', 海: 'ɯmi', 自分: 'dʑibɯɴ', 子: 'ko', 国: 'kɯni', 心: 'kokoɾo', 時間: 'dʑikaɴ', 世界: 'sekai',
}; // prettier-ignore

/** Índice da leitura principal entre as da fonte, ou `undefined` se a palavra não está na lista. */
export function preferJapanese(word: string, ipas: readonly string[]): number | undefined {
  const want = PREFERRED[word.normalize('NFC')];
  if (!want) return undefined;
  const target = normalizeJapaneseIpa(want, word);
  const i = ipas.findIndex((ipa) => normalizeJapaneseIpa(ipa, word) === target);
  return i >= 0 ? i : undefined;
}
