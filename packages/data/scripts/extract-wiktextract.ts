// Extrai do JSONL do kaikki.org (comprimido) as pronúncias com tônica e grava o TSV compacto versionado
// raw/wiktextract/{lang}.tsv. Os arquivos do kaikki (centenas de MB) NÃO entram no repositório.
//
// Uso:
//   curl -O https://kaikki.org/dictionary/Italian/kaikki.org-dictionary-Italian.jsonl.gz
//   curl -O https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl.gz
//   pnpm --filter @falagringo/data extract:wiktextract it-IT /caminho/kaikki.org-dictionary-Italian.jsonl.gz
//   pnpm --filter @falagringo/data extract:wiktextract en-GB /caminho/kaikki.org-dictionary-English.jsonl.gz
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { TARGETS, pickPronunciations, type KaikkiEntry } from '../src/importers/wiktextract';
import { DATA_ROOT } from './lib/write';

const [langArg, file] = process.argv.slice(2);
const target = TARGETS[langArg as keyof typeof TARGETS];
if (!target || !file) {
  console.error(`Uso: extract:wiktextract <${Object.keys(TARGETS).join('|')}> <arquivo.jsonl.gz>`);
  process.exit(1);
}

const lines = createInterface({ input: createReadStream(file).pipe(createGunzip()), crlfDelay: Infinity });
const out: string[] = [];
let objects = 0;
let broken = 0;
for await (const line of lines) {
  if (!line) continue;
  objects++;
  let entry: KaikkiEntry;
  try {
    entry = JSON.parse(line) as KaikkiEntry;
  } catch {
    broken++;
    continue;
  }
  for (const p of pickPronunciations(entry, target)) out.push(`${p.word}\t${p.ipa}`);
  if (objects % 200_000 === 0) console.log(`  ${objects} objetos lidos…`);
}

const dest = path.join(DATA_ROOT, 'raw/wiktextract', `${target.lang}.tsv`);
await mkdir(path.dirname(dest), { recursive: true });
await writeFile(dest, out.join('\n') + '\n');
console.log(
  `${target.lang}: ${objects} objetos (${broken} ilegíveis) → ${out.length} pronúncias em ${path.relative(process.cwd(), dest)}`,
);
