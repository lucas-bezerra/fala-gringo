// Converte raw/wikipron/*.tsv → build/intermediate/{lang}/wikipron.tsv e mostra um relatório.
// Uso: pnpm --filter @falagringo/data import:wikipron
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WIKIPRON_FILES, importWikipron } from '../src/importers/wikipron';
import { validateEntry, type Entry } from '../src/schema';
import { serializeTsv } from '../src/tsv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let hasErrors = false;

for (const [file, lang] of Object.entries(WIKIPRON_FILES)) {
  const text = await readFile(path.join(root, 'raw/wikipron', `${file}.tsv`), 'utf-8');
  const { entries, stats } = importWikipron(text, lang);

  const valid: Entry[] = [];
  let errors = 0;
  let warnings = 0;
  const samples: string[] = [];
  for (const e of entries) {
    const issues = validateEntry(e);
    if (issues.some((i) => i.severity === 'error')) errors++;
    else valid.push(e);
    if (issues.length) {
      if (!issues.some((i) => i.severity === 'error')) warnings++;
      if (samples.length < 3)
        samples.push(`${e.word} /${e.ipa}/: ${issues.map((i) => i.message).join('; ')}`);
    }
  }
  if (errors) hasErrors = true;

  const out = path.join(root, 'build/intermediate', lang, 'wikipron.tsv');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, serializeTsv(lang, 'wikipron', valid));

  const words = new Set(valid.map((e) => e.word)).size;
  console.log(
    `${lang.padEnd(6)} ${String(stats.lines).padStart(6)} linhas → ${String(valid.length).padStart(6)} entradas` +
      ` (${words} palavras) | duplicadas ${stats.duplicates} | puladas ${stats.skipped} | erros ${errors} | avisos ${warnings}`,
  );
  for (const s of samples) console.log(`         ↳ ${s}`);
}

console.log(
  '\nObs.: o WikiPron não traz tônica; ela vem de outra fonte no merge (T2.6) ou de regra do idioma (T3.4).',
);
if (hasErrors) process.exitCode = 1;
