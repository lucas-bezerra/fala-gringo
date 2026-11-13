// Relatório de cobertura (T2.8): quanto do uso real de cada idioma o dicionário cobre.
// Base: as 10 mil palavras mais frequentes de legendas (FrequencyWords/OpenSubtitles 2018, CC BY-SA 4.0).
// As listas são baixadas para build/freq/ (uso interno, não distribuído). Saída: COVERAGE.md.
// Uso: pnpm --filter @falagringo/data coverage   (rode `shards` antes)
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { lookupKey, type Lang } from '../src/schema';
import type { Manifest, ShardFile } from '../src/shards';
import { DATA_ROOT } from './lib/write';

const FREQ_BASE = 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/525f9b560de4/content/2018';
const FREQ_CODE: Partial<Record<Lang, string>> = {
  'en-US': 'en', 'en-GB': 'en', 'de-DE': 'de', 'it-IT': 'it', 'es-ES': 'es', 'es-419': 'es',
  'fr-FR': 'fr', 'ko-KR': 'ko', 'nl-NL': 'nl', 'sv-SE': 'sv', // ja: não há lista (legendas sem segmentação)
}; // prettier-ignore
const TOP = 10_000;

async function freqList(code: string): Promise<[string, number][]> {
  const file = path.join(DATA_ROOT, 'build/freq', `${code}_50k.txt`);
  if (!existsSync(file)) {
    const res = await fetch(`${FREQ_BASE}/${code}/${code}_50k.txt`);
    if (!res.ok) throw new Error(`Lista de frequência ${code}: HTTP ${res.status}`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, await res.text());
  }
  return (await readFile(file, 'utf-8'))
    .split('\n')
    .slice(0, TOP)
    .map((l) => l.trim().split(' '))
    .filter((p) => p.length === 2)
    .map(([w, n]) => [w, Number(n)]);
}

const dict = path.join(DATA_ROOT, 'build/dict');
const manifest = JSON.parse(await readFile(path.join(dict, 'manifest.json'), 'utf-8')) as Manifest;
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');

const rows: string[] = [];
const misses: string[] = [];
for (const [lang, info] of Object.entries(manifest.langs) as [Lang, NonNullable<Manifest['langs'][Lang]>][]) {
  const code = FREQ_CODE[lang];
  if (!code) continue;
  const words = new Map<string, string>(); // chave → tônica da pronúncia principal
  for (const s of info.shards) {
    const shard = JSON.parse(await readFile(path.join(dict, s.file), 'utf-8')) as ShardFile;
    for (const [k, w] of Object.entries(shard.words)) words.set(k, w.v[0][1]);
  }
  const list = await freqList(code);
  const total = list.reduce((a, [, n]) => a + n, 0);
  let found = 0;
  let foundTypes = 0;
  let top1k = 0;
  let stressed = 0;
  const missing: string[] = [];
  list.forEach(([w, n], i) => {
    const s = words.get(lookupKey(w, lang));
    if (s === undefined) {
      if (missing.length < 8) missing.push(w);
      return;
    }
    found += n;
    foundTypes++;
    if (i < 1000) top1k++;
    if (s === 'm' || s === 'b' || s === 'o') stressed += n;
  });
  rows.push(
    `| ${lang} | ${info.words.toLocaleString('pt-BR')} | ${pct(top1k, Math.min(1000, list.length))} | ${pct(foundTypes, list.length)} | **${pct(found, total)}** | ${pct(stressed, found)} |`,
  );
  misses.push(`- **${lang}:** ${missing.join(', ')}`);
}

const today = new Date().toISOString().slice(0, 10);
const md = `# Cobertura do dicionário (T2.8)

> Gerado por \`pnpm --filter @falagringo/data coverage\` em ${today} (dataVersion \`${manifest.dataVersion}\`). Não edite à mão.

Base: as ${TOP.toLocaleString('pt-BR')} palavras mais frequentes de legendas de cada idioma ([FrequencyWords](https://github.com/hermitdave/FrequencyWords), OpenSubtitles 2018, CC BY-SA 4.0 — uso só para medir; a lista não é distribuída).

| Idioma | Palavras no dicionário | Top 1.000 presentes | Top 10.000 presentes | **Uso coberto*** | Uso coberto com tônica resolvida** |
|---|---|---|---|---|---|
${rows.join('\n')}

\\* Fração das ocorrências (ponderada pela frequência) das ${TOP.toLocaleString('pt-BR')} palavras mais usadas que está no dicionário.
\\*\\* Dentro do uso coberto: tônica marcada, emprestada ou monossílaba. Espanhol e francês ficam baixos de propósito — a tônica deles vem por regra (T3.4); japonês e coreano não têm tônica.

Japonês fica de fora: a FrequencyWords não tem lista de japonês (as legendas não vêm segmentadas em palavras).

Listas de legendas incluem nomes, interjeições e grafias informais; parte das ausências é ruído da lista, não lacuna do dicionário. Primeiras ausências por idioma:

${misses.join('\n')}
`;
await writeFile(path.join(DATA_ROOT, 'COVERAGE.md'), md);
console.log(md);
