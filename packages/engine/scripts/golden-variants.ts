// Lista as linhas REVISADAS dos golden sets cuja variante não é mais a principal na tela: as regras (`prefer`,
// Fase 5) escolhem outra variante do dicionário (ex.: francês `de` → də em vez de dam). O gabarito continua
// valendo (ele compara pelo IPA da linha), mas o revisor deve conferir se a linha ainda representa a tela.
// Uso: pnpm --filter @falagringo/engine golden:variants   (rode o `merge` do pacote de dados antes)
import { readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMerged } from '../../data/src/mergedTsv';
import { lookupKey } from '../../data/src/schema';
import { createRuleEstimator } from '../src/g2p/rules';
import { engineSyllabic, parseGolden } from '../src/golden';

const here = path.dirname(fileURLToPath(import.meta.url));
const MERGED = path.resolve(here, '../../data/build/merged');
const GOLDEN = path.resolve(here, '../golden');
const rules = createRuleEstimator();
const sections: string[] = [];

for (const file of readdirSync(GOLDEN)
  .filter((f) => f.endsWith('.tsv'))
  .sort()) {
  const { lang, rows } = parseGolden(await readFile(path.join(GOLDEN, file), 'utf-8'));
  const { entries } = parseMerged(await readFile(path.join(MERGED, `${lang}.tsv`), 'utf-8'));
  const variants = new Map<string, { ipa: string; rank: number }[]>();
  for (const e of entries) {
    const k = lookupKey(e.word, lang);
    (variants.get(k) ?? variants.set(k, []).get(k)!).push({ ipa: e.ipa, rank: e.rank });
  }
  const lines: string[] = [];
  for (const r of rows) {
    if (r.status !== 'revisado') continue;
    const k = lookupKey(r.word, lang);
    const vs = (variants.get(k) ?? []).sort((a, b) => a.rank - b.rank).map((v) => v.ipa);
    const pick = rules.prefer?.(k, lang, vs);
    if (pick === undefined || vs[pick] === r.ipa) continue;
    lines.push(
      `| ${r.word} | \`${r.ipa}\` → **${r.expected}** | \`${vs[pick]}\` → **${engineSyllabic(vs[pick], lang, r.word)}** |`,
    );
  }
  if (lines.length)
    sections.push(
      `## ${lang} (${lines.length})\n\n| Palavra | No gabarito | Na tela agora |\n|---|---|---|\n${lines.join('\n')}\n`,
    );
}

const md = `# Linhas revisadas para conferir de novo

> Gerado por \`pnpm --filter @falagringo/engine golden:variants\`. Não edite à mão.

Estas linhas foram marcadas como \`revisado\`, mas a tela agora mostra **outra variante** do dicionário: a forma de
citação, que as regras de escolha de variante (Fase 5) preferem. Para cada linha, o revisor decide:
- a forma "na tela agora" está certa → troque \`ipa\` e \`esperado\` da linha por ela (continua \`revisado\`);
- a forma do gabarito é a certa → anote em \`observação\`; a regra de escolha precisa de ajuste.

${sections.join('\n') || 'Nenhuma linha.'}
`;
await writeFile(path.join(GOLDEN, 'REVISAR-VARIANTES.md'), md);
console.log(md);
