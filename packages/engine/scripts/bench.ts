/**
 * T3.10 — mede a conversão de 2.000 caracteres com os dados reais (packages/data/build/dict), a frio e a quente,
 * com e sem o cache de palavras e no modo texto misto. Rode depois de `pnpm --filter @falagringo/data shards`.
 *
 *   pnpm --filter @falagringo/engine bench
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { Manifest, ShardFile } from '@falagringo/data/shards';
import {
  cachedDictionary,
  createEngine,
  createPhonology,
  parsePtLexicon,
  ShardDictionary,
} from '../src/index';
import type { Dictionary, Engine, Lang } from '../src/index';

const DIR = join(import.meta.dirname, '../../data/build/dict');
const manifest = JSON.parse(await readFile(join(DIR, 'manifest.json'), 'utf8')) as Manifest;
const lexFile = manifest.lexicons?.['pt-BR']?.file;
const lex = lexFile ? parsePtLexicon(await readFile(join(DIR, lexFile), 'utf8')) : undefined;
const portuguese = lex && { has: (k: string) => lex.words.has(k), isName: (k: string) => lex.names.has(k) };

const SAMPLE: Partial<Record<Lang, string>> = {
  'en-US':
    'The quick brown fox jumps over the lazy dog while the weather in Washington changes through the night. ' +
    'Breaking news: the Senate approved the infrastructure bill on Thursday, and the president said the thought ' +
    'behind it was simple. Researchers at the university think that throughput, bandwidth and software ' +
    'architecture will keep improving. ',
  'de-DE':
    'Die Bundesregierung hat am Donnerstag ein neues Gesetz beschlossen, das die Energieversorgung in ganz ' +
    'Deutschland sichern soll. Wissenschaftler der Universität München glauben, dass die Entwicklung weitergeht. ',
};
const textFor = (lang: Lang) => {
  const base = SAMPLE[lang]!;
  return base.repeat(Math.ceil(2000 / base.length)).slice(0, 2000);
};

function freshDictionary(cache: boolean): Dictionary {
  const dict = new ShardDictionary({
    manifest,
    loadShard: async (file) => JSON.parse(await readFile(join(DIR, file), 'utf8')) as ShardFile,
  });
  return cache ? cachedDictionary(dict) : dict;
}

async function time(engine: Engine, text: string, lang: Lang, mixed = false) {
  const t = performance.now();
  await engine.convert(text, lang, { mixed });
  return performance.now() - t;
}

const rows: string[] = [
  '| idioma | cenário | 1ª (frio, ms) | 2ª (quente, ms) | mediana de 20 (ms) |',
  '|---|---|--:|--:|--:|',
];
for (const lang of Object.keys(SAMPLE) as Lang[]) {
  const text = textFor(lang);
  for (const [label, cache, mixed] of [
    ['sem cache de palavras', false, false],
    ['com cache de palavras', true, false],
    ['com cache, texto misto', true, true],
  ] as const) {
    if (mixed && !portuguese) continue;
    const engine = createEngine({
      dictionary: freshDictionary(cache),
      phonology: createPhonology(),
      portuguese,
    });
    const cold = await time(engine, text, lang, mixed);
    const warm = await time(engine, text, lang, mixed);
    const runs: number[] = [];
    for (let i = 0; i < 20; i++) runs.push(await time(engine, text, lang, mixed));
    runs.sort((a, b) => a - b);
    const med = runs[10]!;
    rows.push(`| ${lang} | ${label} | ${cold.toFixed(0)} | ${warm.toFixed(1)} | ${med.toFixed(1)} |`);
  }
}
console.log(`Texto de 2.000 caracteres, dados ${manifest.dataVersion}\n`);
console.log(rows.join('\n'));
