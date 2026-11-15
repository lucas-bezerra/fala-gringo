// Acrescenta aos golden sets, como RASCUNHO, as palavras mais frequentes de cada idioma que existem no dicionário,
// com a saída atual do motor preenchida. O revisor corrige e marca "revisado". Nunca altera linhas revisadas;
// nos rascunhos, troca o IPA pela variante que o estimador por regras prefere (espanhol, italiano: Fase 5).
// Uso: pnpm --filter @falagringo/engine golden:draft   (rode o `merge` do pacote de dados antes)
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frequencyList } from '../../data/scripts/lib/freq';
import { parseMerged } from '../../data/src/mergedTsv';
import { lookupKey } from '../../data/src/schema';
import { normalizeJapaneseIpa } from '../src/g2p/japanese';
import { createRuleEstimator, ruleToIpa } from '../src/g2p/rules';
import { engineSyllabic, parseGolden, serializeGolden, type GoldenRow } from '../src/golden';
import type { Lang } from '../src/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const MERGED = path.resolve(here, '../../data/build/merged');

/** Idioma → [lista de frequência, quantas palavras]. Inglês: 300 (meta da T3.7); demais: 200. */
const PLAN: [Lang, string, number][] = [
  ['en-US', 'en', 300], ['en-GB', 'en', 300], ['es-ES', 'es', 200], ['es-419', 'es', 200], ['fr-FR', 'fr', 200],
  ['it-IT', 'it', 200], ['de-DE', 'de', 200], ['nl-NL', 'nl', 100], ['sv-SE', 'sv', 100], ['ko-KR', 'ko', 100],
  ['ja-JP', 'ja', 120],
]; // prettier-ignore

/**
 * Japonês: a FrequencyWords não tem lista (as legendas não vêm segmentadas), então a lista é curada: palavras e
 * expressões comuns, em kanji (dicionário) e em kana (regras, porque a fonte quase não tem kana).
 */
const JA_WORDS =
  `私 僕 彼 彼女 人 日本 日本語 東京 大阪 京都 今日 明日 昨日 今 時間 年 月 日 水 山 川 花 犬 猫 車 電車 駅
  学校 学生 先生 友達 名前 仕事 会社 家 国 世界 天気 元気 大丈夫 本当 本 中 上 下 前 後 男 女 子供 手 目 口 心 金
  一 二 三 十 百 千 万 円 東 西 南 北 雨 雪 海 空 寿司 天ぷら 刺身 漫画 映画 音楽 写真 電話 自分 時 何 誰 行く 来る
  見る 食べる 飲む 話す 書く 読む 聞く 思う 言う 好き 新しい 大きい 小さい 高い 安い
  ありがとう ございます こんにちは こんばんは おはよう さようなら すみません ください はい いいえ です ます
  ラーメン コーヒー テレビ パン ビール アニメ カラオケ ちょっと とても もう まだ どこ これ それ あれ この は を が の に で と も か ね よ`
    .split(/\s+/u)
    .filter(Boolean);

for (const [lang, code, target] of PLAN) {
  const { entries } = parseMerged(await readFile(path.join(MERGED, `${lang}.tsv`), 'utf-8'));
  const variants = new Map<string, { word: string; ipa: string; rank: number }[]>();
  for (const e of entries) {
    const k = lookupKey(e.word, lang);
    (variants.get(k) ?? variants.set(k, []).get(k)!).push({ word: e.word, ipa: e.ipa, rank: e.rank });
  }
  const rules = createRuleEstimator();
  const primary = new Map<string, { word: string; ipa: string }>();
  for (const [k, vs] of variants) {
    vs.sort((a, b) => a.rank - b.rank);
    const pick =
      rules.prefer?.(
        k,
        lang,
        vs.map((v) => v.ipa),
      ) ?? 0;
    primary.set(k, vs[pick]);
  }

  const file = path.resolve(here, `../golden/${lang}.tsv`);
  const existing: GoldenRow[] = existsSync(file) ? parseGolden(await readFile(file, 'utf-8')).rows : [];
  let changed = 0;
  for (const row of existing) {
    const p = primary.get(lookupKey(row.word, lang));
    if (row.status !== 'rascunho' || !p || p.ipa === row.ipa || /\s/.test(p.ipa)) continue;
    row.ipa = p.ipa;
    row.expected = engineSyllabic(p.ipa, lang, row.word);
    row.note = 'variante escolhida pelas regras (a 1ª do dicionário era outra)';
    changed++;
  }
  const have = new Set(existing.map((r) => lookupKey(r.word, lang)));
  const added: GoldenRow[] = [];
  const words = lang === 'ja-JP' ? JA_WORDS.map((w) => [w]) : await frequencyList(code);
  for (const [w] of words) {
    if (existing.length + added.length >= target) break;
    const key = lookupKey(w, lang);
    let p = primary.get(key);
    if (lang === 'ja-JP') {
      // kana fora do dicionário: regras; IPA do dicionário normalizado (vogal longa, -su final), como o motor faz
      const ipa = p ? p.ipa : ruleToIpa(w, lang);
      p = ipa ? { word: w, ipa: normalizeJapaneseIpa(ipa, w) } : undefined;
    }
    if (!p || have.has(key) || /\s/.test(p.ipa)) continue; // só palavras do dicionário, uma palavra de IPA
    have.add(key);
    added.push({
      word: p.word,
      ipa: p.ipa,
      expected: engineSyllabic(p.ipa, lang, p.word),
      status: 'rascunho',
      note: '',
    });
  }
  await writeFile(file, serializeGolden(lang, [...existing, ...added]));
  console.log(
    `${lang.padEnd(6)} ${existing.length} existentes (${changed} rascunhos com outra variante) + ${added.length} novos`,
  );
}
