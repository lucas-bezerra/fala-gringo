// Publica no site (apps/web/public/dict/) os shards dos idiomas ATIVOS, o léxico do português e os créditos.
// Se os shards ainda não existem (clone novo, CI), roda o pipeline a partir dos dados versionados em raw/ (~40 s).
import { execSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Idiomas que o site oferece. Manter em sincronia com apps/web/src/engine/langs.ts.
const ACTIVE = ['en-US', 'en-GB'];

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const dictDir = path.join(pkg, 'build/dict');
const outDir = path.resolve(pkg, '../../apps/web/public/dict');

if (!existsSync(path.join(dictDir, 'manifest.json'))) {
  console.log('[data] shards ausentes: rodando o pipeline (import → merge → shards)…');
  const steps = [
    'import:ipa-dict',
    'import:cmudict',
    'import:britfone',
    'import:wikipron',
    'import:wiktextract',
    'import:wikidata',
    'merge',
    'shards',
  ];
  for (const step of steps) execSync(`pnpm -s ${step}`, { cwd: pkg, stdio: ['ignore', 'ignore', 'inherit'] });
}

const manifest = JSON.parse(await readFile(path.join(dictDir, 'manifest.json'), 'utf8'));
for (const lang of ACTIVE) {
  if (!manifest.langs[lang]) throw new Error(`[data] ${lang} não está no manifest: rode o pipeline de novo`);
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
let bytes = 0;
for (const lang of ACTIVE) {
  await cp(path.join(dictDir, lang), path.join(outDir, lang), { recursive: true });
  bytes += manifest.langs[lang].shards.reduce((n, s) => n + s.bytes, 0);
}
const lexicon = manifest.lexicons?.['pt-BR'];
if (lexicon) await cp(path.join(dictDir, lexicon.file), path.join(outDir, lexicon.file));
await cp(path.join(dictDir, 'NOTICE.md'), path.join(outDir, 'NOTICE.md'));

// manifest só com os idiomas ativos (o resto não é publicado)
const published = { ...manifest, langs: Object.fromEntries(ACTIVE.map((l) => [l, manifest.langs[l]])) };
await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(published));
console.log(
  `[data] ${ACTIVE.join(', ')} publicados em ${path.relative(process.cwd(), outDir)} (${(bytes / 1e6).toFixed(1)} MB sem compressão, dados ${manifest.dataVersion})`,
);
