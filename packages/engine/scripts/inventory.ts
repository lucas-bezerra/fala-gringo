// Analisa TODAS as pronúncias mescladas com o parser de IPA (T3.3): confere a ida e volta e gera o inventário de
// sons por idioma (INVENTORY.md) — a lista que as regras de conversão (T3.5–T3.6, T5.x) precisam cobrir.
// Uso: pnpm --filter @falagringo/engine inventory   (rode o `merge` do pacote de dados antes)
import { readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMerged } from '../../data/src/mergedTsv';
import { parseIpa, serializeIpa } from '../src/ipa/parse';

const here = path.dirname(fileURLToPath(import.meta.url));
const MERGED = path.resolve(here, '../../data/build/merged');
const fmt = (n: number) => n.toLocaleString('pt-BR');

const summary: string[] = [];
const sections: string[] = [];
let totalFailures = 0;

for (const file of readdirSync(MERGED)
  .filter((f) => f.endsWith('.tsv'))
  .sort()) {
  const { lang, entries } = parseMerged(await readFile(path.join(MERGED, file), 'utf-8'));
  const phones = new Map<string, { n: number; vowel: boolean; example: string }>();
  const features = new Map<string, number>();
  const others = new Map<string, { n: number; example: string }>();
  const unknownMarks = new Map<string, number>();
  let tones = 0;
  let failures = 0;
  const failureExamples: string[] = [];

  for (const e of entries) {
    const tokens = parseIpa(e.ipa, lang);
    if (serializeIpa(tokens) !== e.ipa.normalize('NFC')) {
      failures++;
      if (failureExamples.length < 3) failureExamples.push(`${e.word} /${e.ipa}/`);
    }
    for (const t of tokens) {
      if (t.kind === 'phone') {
        const p = phones.get(t.base) ?? { n: 0, vowel: t.vowel, example: `${e.word} /${e.ipa}/` };
        p.n++;
        phones.set(t.base, p);
        for (const f of t.features) features.set(f, (features.get(f) ?? 0) + 1);
        if (t.tone) features.set(`tom:${t.tone}`, (features.get(`tom:${t.tone}`) ?? 0) + 1);
        for (const m of t.unknownMarks ?? []) unknownMarks.set(m, (unknownMarks.get(m) ?? 0) + 1);
      } else if (t.kind === 'other') {
        const o = others.get(t.text) ?? { n: 0, example: `${e.word} /${e.ipa}/` };
        o.n++;
        others.set(t.text, o);
      } else if (t.kind === 'tone') tones++;
    }
  }
  totalFailures += failures;

  const sorted = [...phones].sort((a, b) => b[1].n - a[1].n);
  const list = (vowel: boolean) =>
    sorted
      .filter(([, p]) => p.vowel === vowel)
      .map(([b, p]) => `\`${b}\` ${fmt(p.n)}`)
      .join(' · ');
  const rare = sorted.filter(([, p]) => p.n < 20);
  summary.push(
    `| ${lang} | ${fmt(entries.length)} | ${failures === 0 ? '✅ 100%' : `❌ ${failures}`} | ${sorted.filter(([, p]) => p.vowel).length} | ${sorted.filter(([, p]) => !p.vowel).length} | ${rare.length} | ${[...others.values()].reduce((a, o) => a + o.n, 0)} | ${tones} |`,
  );
  sections.push(
    [
      `## ${lang}`,
      '',
      `**Vogais:** ${list(true)}`,
      '',
      `**Consoantes:** ${list(false)}`,
      '',
      `**Traços:** ${
        [...features]
          .sort((a, b) => b[1] - a[1])
          .map(([f, n]) => `${f} ${fmt(n)}`)
          .join(' · ') || '—'
      }`,
      '',
      rare.length
        ? `**Sons raros (< 20 ocorrências — em geral palavras estrangeiras ou erro da fonte):** ${rare.map(([b, p]) => `\`${b}\` (${p.example})`).join('; ')}`
        : '',
      others.size
        ? `**"Outro" (não é som nem marca):** ${[...others].map(([t, o]) => `\`${t}\` ×${o.n} (${o.example})`).join('; ')}`
        : '',
      unknownMarks.size
        ? `**Marcas sem traço conhecido:** ${[...unknownMarks].map(([m, n]) => `U+${m.codePointAt(0)!.toString(16).toUpperCase()} ×${n}`).join('; ')}`
        : '',
      failureExamples.length ? `**Falhas de ida e volta:** ${failureExamples.join('; ')}` : '',
      '',
    ]
      .filter((l, i, a) => l !== '' || a[i - 1] !== '')
      .join('\n'),
  );
}

const md = `# Inventário de sons por idioma (T3.3)

> Gerado por \`pnpm --filter @falagringo/engine inventory\` a partir de \`packages/data/build/merged\`. Não edite à mão.

Cada pronúncia mesclada foi analisada pelo parser de IPA ([src/ipa/parse.ts](src/ipa/parse.ts)), com os agrupamentos do idioma (africadas e ditongos). **Ida e volta** = remontar os tokens devolve exatamente o IPA original. Este inventário é a lista que as regras de conversão (T3.5–T3.6 e Fase 5) precisam cobrir.

| Idioma | Pronúncias | Ida e volta | Vogais distintas | Consoantes distintas | Sons raros (< 20) | "Outro" | Tons |
|---|---|---|---|---|---|---|---|
${summary.join('\n')}

${sections.join('\n')}`;

await writeFile(path.resolve(here, '../INVENTORY.md'), md);
console.log(md.split('\n').slice(0, 22).join('\n'));
if (totalFailures) process.exitCode = 1;
