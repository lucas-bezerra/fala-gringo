// raw/wiktextract/{it-IT,en-GB}.tsv → build/intermediate/{lang}/wiktextract.tsv
// Uso: pnpm --filter @falagringo/data import:wiktextract   (para regenerar o raw: extract:wiktextract)
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TARGETS, importWiktextract } from '../src/importers/wiktextract';
import { DATA_ROOT, writeIntermediate } from './lib/write';

let ok = true;
for (const { lang } of Object.values(TARGETS)) {
  const file = path.join(DATA_ROOT, 'raw/wiktextract', `${lang}.tsv`);
  if (!existsSync(file)) {
    console.warn(`${lang}: ${path.relative(process.cwd(), file)} não existe — rode extract:wiktextract`);
    ok = false;
    continue;
  }
  ok =
    (await writeIntermediate(lang, 'wiktextract', importWiktextract(await readFile(file, 'utf-8'), lang))) &&
    ok;
}
if (!ok) process.exitCode = 1;
