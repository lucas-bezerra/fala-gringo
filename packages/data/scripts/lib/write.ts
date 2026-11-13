// Utilitário comum dos scripts de importação: valida, grava o TSV intermediário e imprime o relatório.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEntry, type Entry, type Lang } from '../../src/schema';
import type { SourceId } from '../../src/sources';
import { serializeTsv } from '../../src/tsv';

export const DATA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Grava build/intermediate/{lang}/{source}.tsv com as entradas válidas. Devolve `false` se houve erro. */
export async function writeIntermediate(lang: Lang, source: SourceId, entries: Entry[]): Promise<boolean> {
  const valid: Entry[] = [];
  let errors = 0;
  let warnings = 0;
  const samples: string[] = [];
  for (const e of entries) {
    const issues = validateEntry(e);
    const isError = issues.some((i) => i.severity === 'error');
    if (isError) errors++;
    else valid.push(e);
    if (issues.length && !isError) warnings++;
    if (issues.length && samples.length < 3)
      samples.push(`${e.word} /${e.ipa}/: ${issues.map((i) => i.message).join('; ')}`);
  }
  const out = path.join(DATA_ROOT, 'build/intermediate', lang, `${source}.tsv`);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, serializeTsv(lang, source, valid));

  const words = new Set(valid.map((e) => e.word)).size;
  console.log(
    `${lang.padEnd(6)} ${source.padEnd(11)} ${String(valid.length).padStart(7)} entradas (${words} palavras)` +
      ` | erros ${errors} | avisos ${warnings}`,
  );
  for (const s of samples) console.log(`         ↳ ${s}`);
  return errors === 0;
}
