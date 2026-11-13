// Converte raw/cmudict/cmudict.dict → build/intermediate/en-US/cmudict.tsv e mostra um relatório.
// Se o ipa-dict já tiver sido importado, compara as duas conversões (ambas derivam do CMUdict).
// Uso: pnpm --filter @falagringo/data import:cmudict
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importCmudict } from '../src/importers/cmudict';
import { validateEntry, type Entry } from '../src/schema';
import { parseTsv, serializeTsv } from '../src/tsv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = await readFile(path.join(root, 'raw/cmudict/cmudict.dict'), 'utf-8');
const { entries, stats } = importCmudict(text);

const invalid = new Set(entries.filter((e) => validateEntry(e).length > 0));
const out = path.join(root, 'build/intermediate/en-US/cmudict.tsv');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(
  out,
  serializeTsv(
    'en-US',
    'cmudict',
    entries.filter((e) => !invalid.has(e)),
  ),
);

console.log(
  `cmudict: ${stats.lines} linhas → ${stats.entries} entradas | falhas ${stats.failures.length} | inválidas ${invalid.size}`,
);
for (const f of stats.failures.slice(0, 5)) console.log(`  ↳ linha ${f.line}: ${f.error}`);
for (const e of [...invalid].slice(0, 5))
  console.log(
    `  ↳ ${e.word}: ${validateEntry(e)
      .map((i) => i.message)
      .join('; ')}`,
  );

const ipaDictPath = path.join(root, 'build/intermediate/en-US/ipa-dict.tsv');
if (existsSync(ipaDictPath)) {
  // O ipa-dict usa ɫ em todo l e não distingue ɝ/ɚ nem ʌ/ə: neutraliza essas convenções antes de comparar.
  const conv = (ipa: string) => ipa.replace(/ɫ/g, 'l').replace(/ɚ/g, 'ɝ').replace(/ʌ/g, 'ə');
  const strip = (ipa: string) => conv(ipa).replace(/[ˈˌ]/g, '');
  const primary = (list: Entry[]) => {
    const map = new Map<string, string>();
    for (const e of list) if (e.rank === 0) map.set(e.word.toLowerCase(), e.ipa);
    return map;
  };
  const cmu = primary(entries);
  const ipaDict = primary(parseTsv(await readFile(ipaDictPath, 'utf-8')).entries);

  let common = 0;
  let same = 0;
  let sameSegments = 0;
  const diffs: string[] = [];
  for (const [word, ipa] of cmu) {
    const other = ipaDict.get(word);
    if (other === undefined) continue;
    common++;
    if (conv(other) === conv(ipa)) same++;
    else if (strip(other) === strip(ipa)) sameSegments++;
    else if (diffs.length < 12) diffs.push(`${word}: cmudict ${ipa} × ipa-dict ${other}`);
  }
  const pct = (n: number) => `${((100 * n) / common).toFixed(1)}%`;
  console.log(
    `\nComparação com ipa-dict en-US (pronúncia principal, convenções ɫ/ɚ/ʌ neutralizadas, ${common} palavras em comum):`,
  );
  console.log(`  idênticas:                     ${same} (${pct(same)})`);
  console.log(`  mesmos sons, tônica diferente: ${sameSegments} (${pct(sameSegments)})`);
  console.log(
    `  sons diferentes:               ${common - same - sameSegments} (${pct(common - same - sameSegments)})`,
  );
  for (const d of diffs) console.log(`  ↳ ${d}`);
}

if (stats.failures.length || invalid.size) process.exitCode = 1;
