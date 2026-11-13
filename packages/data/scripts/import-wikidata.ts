// raw/wikidata/p898.tsv → build/intermediate/{lang}/wikidata.tsv
// Uso: pnpm --filter @falagringo/data import:wikidata   (para atualizar o retrato: fetch:wikidata)
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { importWikidata } from '../src/importers/wikidata';
import type { Entry, Lang } from '../src/schema';
import { DATA_ROOT, writeIntermediate } from './lib/write';

const text = await readFile(path.join(DATA_ROOT, 'raw/wikidata/p898.tsv'), 'utf-8');
const { entries, stats } = importWikidata(text);
console.log(
  `wikidata: ${stats.rows} linhas → ${stats.entries} entradas | fora de pessoa/lugar/clube ${stats.otherKind}`,
);

const byLang = new Map<Lang, Entry[]>();
for (const e of entries) byLang.set(e.lang, [...(byLang.get(e.lang) ?? []), e]);
let ok = true;
for (const [lang, list] of [...byLang].sort()) ok = (await writeIntermediate(lang, 'wikidata', list)) && ok;
if (!ok) process.exitCode = 1;
