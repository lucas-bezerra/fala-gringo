// build/merged/{lang}.tsv → build/dict/{lang}/{hash}.json + build/dict/manifest.json
// Uso: pnpm --filter @falagringo/data shards   (rode `merge` antes)
import { readdirSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseMerged } from '../src/mergedTsv';
import { DEFAULT_MAX_GZIP, buildShards, dataVersionOf } from '../src/shardBuilder';
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

manifest.dataVersion = dataVersionOf(allFiles);
const manifestJson = JSON.stringify(manifest);
await writeFile(path.join(OUT, 'manifest.json'), manifestJson);
console.log(
  `\nmanifest.json: ${kb(Buffer.byteLength(manifestJson))} | ${allFiles.length} shards | dataVersion ${manifest.dataVersion}`,
);
