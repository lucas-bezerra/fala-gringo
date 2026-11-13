// build/merged/{lang}.tsv → build/dict/{lang}/{hash}.json + build/dict/manifest.json
// Uso: pnpm --filter @falagringo/data shards   (rode `merge` antes)
import { readdirSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseMerged } from '../src/mergedTsv';
import { DEFAULT_MAX_GZIP, buildShards, dataVersionOf } from '../src/shardBuilder';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { renderNotice } from '../src/notice';
import { buildPtLexicon, serializePtLexicon } from '../src/ptLexicon';
import { frequencyList } from './lib/freq';
import { SHARD_FORMAT, SOURCE_ORDER, type Manifest } from '../src/shards';
import { DATA_ROOT } from './lib/write';

const MERGED = path.join(DATA_ROOT, 'build/merged');
const OUT = path.join(DATA_ROOT, 'build/dict');
await rm(OUT, { recursive: true, force: true });

const manifest: Manifest = { format: SHARD_FORMAT, dataVersion: '', sources: SOURCE_ORDER, langs: {} };
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
const allFiles: string[] = [];

console.log('| Idioma | Palavras | Shards | gzip médio | gzip máximo | Total gzip | Total bruto |');
console.log('|---|---|---|---|---|---|---|');
for (const file of readdirSync(MERGED)
  .filter((f) => f.endsWith('.tsv'))
  .sort()) {
  const { lang, entries } = parseMerged(await readFile(path.join(MERGED, file), 'utf-8'));
  const { shards, words, prons } = buildShards(lang, entries);
  await mkdir(path.join(OUT, lang), { recursive: true });
  for (const s of shards) await writeFile(path.join(OUT, s.ref.file), s.content);
  manifest.langs[lang] = { words, prons, shards: shards.map((s) => s.ref) };
  allFiles.push(...shards.map((s) => s.ref.file));

  const gz = shards.map((s) => s.ref.gzip);
  const total = gz.reduce((a, b) => a + b, 0);
  const raw = shards.reduce((a, s) => a + s.ref.bytes, 0);
  console.log(
    `| ${lang} | ${words} | ${shards.length} | ${kb(total / shards.length)} | ${kb(Math.max(...gz))} | ${mb(total)} | ${mb(raw)} |`,
  );
  if (Math.max(...gz) > DEFAULT_MAX_GZIP) throw new Error(`${lang}: shard acima do limite`);
}

// Léxico do português para o modo texto misto (T3.2).
const freqWords = async (code: string) => (await frequencyList(code)).map(([w]) => w);
const others: Record<string, string[]> = {};
for (const code of ['en', 'es', 'fr', 'it', 'de', 'nl', 'sv']) others[code] = await freqWords(code);
const wikipronWords = (await readFile(path.join(DATA_ROOT, 'raw/wikipron/por_latn_bz_broad.tsv'), 'utf-8'))
  .split('\n')
  .map((l) => l.split('\t')[0])
  .filter(Boolean);
const lexicon = buildPtLexicon({
  ptFrequency: await freqWords('pt_br'),
  otherFrequency: others,
  wikipronWords,
});
const lexText = serializePtLexicon(lexicon);
const lexFile = `pt-BR-lexicon.${createHash('sha256').update(lexText).digest('hex').slice(0, 12)}.txt`;
await writeFile(path.join(OUT, lexFile), lexText);
const lexGzip = gzipSync(Buffer.from(lexText), { level: 9 }).length;
manifest.lexicons = {
  'pt-BR': { file: lexFile, words: lexicon.words.length, bytes: Buffer.byteLength(lexText), gzip: lexGzip },
};
allFiles.push(lexFile);
console.log(
  `\nléxico pt-BR: ${lexicon.words.length} palavras + ${lexicon.names.length} nomes próprios, ${kb(lexGzip)} gzip | ruído removido ${lexicon.noise.length} | nomes próprios removidos ${lexicon.properOnly.length}`,
);

manifest.dataVersion = dataVersionOf(allFiles);
const manifestJson = JSON.stringify(manifest);
await writeFile(path.join(OUT, 'manifest.json'), manifestJson);
await writeFile(path.join(OUT, 'NOTICE.md'), renderNotice()); // créditos publicados junto dos dados
console.log(
  `\nmanifest.json: ${kb(Buffer.byteLength(manifestJson))} | ${allFiles.length} shards | dataVersion ${manifest.dataVersion}`,
);
