// raw/britfone/britfone.main.3.0.1.csv → build/intermediate/en-GB/britfone.tsv
// Uso: pnpm --filter @falagringo/data import:britfone
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { importBritfone } from '../src/importers/britfone';
import { DATA_ROOT, writeIntermediate } from './lib/write';

const text = await readFile(path.join(DATA_ROOT, 'raw/britfone/britfone.main.3.0.1.csv'), 'utf-8');
const { entries, stats } = importBritfone(text);
for (const f of stats.failures.slice(0, 5)) console.log(`  ↳ linha ${f.line}: ${f.error}`);
const ok = await writeIntermediate('en-GB', 'britfone', entries);
if (!ok || stats.failures.length) process.exitCode = 1;
