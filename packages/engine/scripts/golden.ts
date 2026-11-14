// Mede o motor contra os golden sets (T3.8). Roda no CI: não precisa dos dados brutos (o IPA está no gabarito).
// Falha se um idioma com meta em golden/metas.json ficar abaixo dela (com o mínimo de linhas revisadas).
// Uso: pnpm test:golden
import { readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGolden, scoreGolden } from '../src/golden';

const here = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(here, '../golden');
const metas = JSON.parse(await readFile(path.join(DIR, 'metas.json'), 'utf-8')) as {
  minimoRevisadas: number;
  metas: Record<string, number>;
};
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');

const rows: string[] = [];
const misses: string[] = [];
const failures: string[] = [];
for (const file of readdirSync(DIR)
  .filter((f) => f.endsWith('.tsv'))
  .sort()) {
  const { lang, rows: golden } = parseGolden(await readFile(path.join(DIR, file), 'utf-8'));
  const s = scoreGolden(lang, golden);
  const meta = metas.metas[lang];
  const enough = s.reviewed >= metas.minimoRevisadas;
  const accuracy = s.reviewed ? (100 * s.correct) / s.reviewed : 0;
  let status = '—';
  if (meta !== undefined) {
    if (!enough) status = `aguardando revisão (${s.reviewed}/${metas.minimoRevisadas})`;
    else if (accuracy >= meta) status = `✅ meta ${meta}%`;
    else {
      status = `❌ abaixo da meta ${meta}%`;
      failures.push(`${lang}: ${accuracy.toFixed(1)}% < ${meta}%`);
    }
  }
  rows.push(`| ${lang} | ${s.reviewed} | ${s.drafts} | **${pct(s.correct, s.reviewed)}** | ${status} |`);
  if (s.misses.length)
    misses.push(
      `- **${lang}:** ${s.misses
        .slice(0, 15)
        .map((m) => `${m.word}: esperado \`${m.expected}\`, motor \`${m.got}\``)
        .join('; ')}`,
    );
}

const md = `# Golden sets — acerto do motor (T3.8)

> Gerado por \`pnpm test:golden\`. Não edite à mão. Como revisar: [golden/README.md](golden/README.md).

Só as linhas **revisadas** por humano contam. Rascunho = saída atual do motor esperando revisão.

| Idioma | Revisadas | Rascunhos | Acerto | Meta |
|---|---|---|---|---|
${rows.join('\n')}

${misses.length ? `## Erros nas linhas revisadas\n\n${misses.join('\n')}\n` : ''}`;
await writeFile(path.resolve(here, '../GOLDEN.md'), md);
console.log(md);
if (failures.length) {
  console.error(`\nAbaixo da meta: ${failures.join('; ')}`);
  process.exitCode = 1;
}
