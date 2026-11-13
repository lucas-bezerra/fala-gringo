// Converte raw/ipa-dict/*.txt → build/intermediate/{lang}/ipa-dict.tsv e mostra um relatório.
// Uso: pnpm --filter @falagringo/data import:ipa-dict
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IPA_DICT_FILES, importIpaDict } from '../src/importers/ipaDict';
import { validateEntry } from '../src/schema';
import { serializeTsv } from '../src/tsv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let hasErrors = false;

for (const [file, lang] of Object.entries(IPA_DICT_FILES)) {
  const text = await readFile(path.join(root, 'raw/ipa-dict', `${file}.txt`), 'utf-8');
  const { entries, stats } = importIpaDict(text, lang);

  const valid = [];
  let errors = 0;
  let warnings = 0;
  const samples: string[] = [];
  for (const e of entries) {
    const issues = validateEntry(e);
    if (issues.some((i) => i.severity === 'error')) {
      errors++;
      if (samples.length < 3) samples.push(`${e.word}: ${issues.map((i) => i.message).join('; ')}`);
      continue;
    }
    if (issues.length) warnings++;
    valid.push(e);
  }
  if (errors) hasErrors = true;

  const out = path.join(root, 'build/intermediate', lang, 'ipa-dict.tsv');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, serializeTsv(lang, 'ipa-dict', valid));

  console.log(
    `${lang.padEnd(6)} ${String(stats.lines).padStart(7)} linhas → ${String(valid.length).padStart(7)} entradas` +
      ` | puladas ${stats.skipped} | erros ${errors} | avisos ${warnings}`,
  );
  for (const s of samples) console.log(`         ↳ ${s}`);
}

if (hasErrors) process.exitCode = 1;
