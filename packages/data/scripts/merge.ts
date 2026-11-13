// build/intermediate/{lang}/{fonte}.tsv → build/merged/{lang}.tsv, com relatório por idioma.
// Uso: pnpm --filter @falagringo/data merge   (rode os import:* antes)
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PRIORITY, STRESS_DONORS, mergeLanguage, type MergeReport } from '../src/merge';
import { serializeMerged } from '../src/mergedTsv';
import { lookupKey, type Entry, type Lang } from '../src/schema';
import type { SourceId } from '../src/sources';
import { parseTsv } from '../src/tsv';
import { DATA_ROOT } from './lib/write';

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');
const reports: MergeReport[] = [];
/** Pronúncia principal com tônica por chave de busca, dos idiomas que servem de doador. */
const primaryStressed = new Map<Lang, Map<string, string>>();
const missing: string[] = [];

for (const [lang, priority] of Object.entries(PRIORITY) as [Lang, SourceId[]][]) {
  const bySource = new Map<SourceId, Entry[]>();
  for (const source of priority) {
    const file = path.join(DATA_ROOT, 'build/intermediate', lang, `${source}.tsv`);
    if (!existsSync(file)) {
      missing.push(`${lang}/${source}`);
      continue;
    }
    const parsed = parseTsv(await readFile(file, 'utf-8'));
    bySource.set(source, parsed.entries);
  }
  const donorLang = STRESS_DONORS[lang];
  const stressDonor = donorLang ? primaryStressed.get(donorLang) : undefined;
  if (donorLang && !stressDonor) throw new Error(`${donorLang} precisa ser mesclado antes de ${lang}`);
  const { entries, report } = mergeLanguage(lang, bySource, priority, { stressDonor });
  if (Object.values(STRESS_DONORS).includes(lang)) {
    const map = new Map<string, string>();
    for (const e of entries)
      if (e.rank === 0 && e.stress === 'marked') map.set(lookupKey(e.word, lang), e.ipa);
    primaryStressed.set(lang, map);
  }
  const out = path.join(DATA_ROOT, 'build/merged', `${lang}.tsv`);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, serializeMerged(lang, entries));
  reports.push(report);
}

console.log(
  '| Idioma | Palavras | Pronúncias | Tônica marcada | Emprestada | Monossílabas | Sem tônica | Concordância* | Fonte escolhida |',
);
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of reports) {
  const chosen = Object.entries(r.chosen)
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `${s} ${n}`)
    .join(', ');
  console.log(
    `| ${r.lang} | ${r.words} | ${r.entries} | ${pct(r.stress.marked, r.words)} | ${pct(r.stress.borrowed, r.words)} | ${pct(r.stress.mono, r.words)}` +
      ` | ${pct(r.stress.none, r.words)} | ${pct(r.agreed, r.multiSource)} (${r.multiSource}) | ${chosen} |`,
  );
}
console.log(
  '\n* palavras em que outra fonte concorda com a pronúncia principal, entre as que estão em mais de uma fonte.',
);
if (missing.length) {
  console.warn(`\nFontes ausentes (rode o import correspondente): ${missing.join(', ')}`);
  process.exitCode = 1;
}
