// Cobertura das regras (T3.5): quantos sons dos dados reais caem em alguma regra (e não no reserva "?").
// Também mede o tempo de conversão. Gera RULES-COVERAGE.md.
// Uso: pnpm --filter @falagringo/engine rules-coverage   (rode o `merge` do pacote de dados antes)
import { readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMerged } from '../../data/src/mergedTsv';
import { parseIpa, phonesOf } from '../src/ipa/parse';
import { renderPronunciation, type RenderDiagnostics } from '../src/phonology';
import type { StressSource } from '../src/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const MERGED = path.resolve(here, '../../data/build/merged');
const fmt = (n: number) => n.toLocaleString('pt-BR');
const STRESS: Record<string, Exclude<StressSource, 'rule'>> = {
  marked: 'dictionary',
  mono: 'dictionary',
  borrowed: 'borrowed',
  none: 'none',
};

const rows: string[] = [];
const details: string[] = [];
let failures = 0;

for (const file of readdirSync(MERGED)
  .filter((f) => f.endsWith('.tsv'))
  .sort()) {
  const { lang, entries } = parseMerged(await readFile(path.join(MERGED, file), 'utf-8'));
  let phones = 0;
  const unmapped = new Map<string, { n: number; example: string }>();
  const t0 = performance.now();
  for (const e of entries) {
    const diag: RenderDiagnostics = { unmapped: [] };
    try {
      renderPronunciation(e.ipa, lang, STRESS[e.stress], e.word, diag);
    } catch (error) {
      failures++;
      if (failures <= 5) console.error(`${lang} ${e.word} /${e.ipa}/: ${(error as Error).message}`);
      continue;
    }
    phones += phonesOf(parseIpa(e.ipa, lang)).length;
    for (const b of diag.unmapped) {
      const u = unmapped.get(b) ?? { n: 0, example: `${e.word} /${e.ipa}/` };
      u.n++;
      unmapped.set(b, u);
    }
  }
  const ms = performance.now() - t0;
  const miss = [...unmapped.values()].reduce((a, u) => a + u.n, 0);
  rows.push(
    `| ${lang} | ${fmt(entries.length)} | ${fmt(phones)} | **${((100 * (phones - miss)) / phones).toFixed(3)}%** | ${fmt(miss)} | ${(ms / entries.length).toFixed(3)} ms |`,
  );
  if (unmapped.size) {
    details.push(
      `- **${lang}:** ${[...unmapped]
        .sort((a, b) => b[1].n - a[1].n)
        .map(([b, u]) => `\`${b}\` ×${u.n} (${u.example})`)
        .join('; ')}`,
    );
  }
}

const md = `# Cobertura das regras (T3.5)

> Gerado por \`pnpm --filter @falagringo/engine rules-coverage\`. Não edite à mão. Regras em [src/rules/](src/rules/).

Todas as pronúncias mescladas passaram pela fonologia completa (parser → sílabas → regras). **Coberto** = o som caiu em alguma regra; o resto saiu pelo reserva (a base, destacada).

| Idioma | Pronúncias | Sons | Coberto | Sem regra | Tempo médio por pronúncia |
|---|---|---|---|---|---|
${rows.join('\n')}

${details.length ? `## Sons sem regra\n\n${details.join('\n')}\n` : 'Nenhum som sem regra.\n'}
${failures ? `\n**Falhas de conversão:** ${failures}\n` : ''}`;
await writeFile(path.resolve(here, '../RULES-COVERAGE.md'), md);
console.log(md);
if (failures) process.exitCode = 1;
