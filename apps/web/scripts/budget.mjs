// Orçamento de tamanho (T6.3): mede, depois do build, o que o navegador baixa para abrir a tela inicial
// (scripts e CSS referenciados pelo index.html), o worker do motor, o service worker e o maior shard.
// Falha se algo passar de apps/web/budget.json.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const budget = JSON.parse(readFileSync(join(root, 'budget.json'), 'utf8'));
const gz = (file) => gzipSync(readFileSync(join(dist, file)), { level: 9 }).length / 1024;
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const refs = (re) => [...html.matchAll(re)].map((m) => m[1].replace(/^\//, ''));

const js = refs(/<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="([^"]+\.js)"/g);
const css = refs(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"/g);
const workers = readdirSync(join(dist, 'assets')).filter((f) => f.startsWith('engine.worker-'));
const shards = [];
for (const lang of readdirSync(join(dist, 'dict'))) {
  const dir = join(dist, 'dict', lang);
  if (statSync(dir).isDirectory()) for (const f of readdirSync(dir)) shards.push(join('dict', lang, f));
}

const rows = [
  ['initialJs', 'JS inicial', js.reduce((n, f) => n + gz(f), 0)],
  ['initialCss', 'CSS inicial', css.reduce((n, f) => n + gz(f), 0)],
  ['worker', 'Worker do motor', workers.reduce((n, f) => n + gz(join('assets', f)), 0)],
  ['serviceWorker', 'Service worker', gz('sw.js')],
  ['largestShard', 'Maior shard', Math.max(...shards.map(gz))],
];

let failed = false;
console.log('| Item | KB gzip | Orçamento |\n|---|--:|--:|');
for (const [key, label, kb] of rows) {
  const ok = kb <= budget[key];
  failed ||= !ok;
  console.log(`| ${label} | ${kb.toFixed(1)} | ${budget[key]} ${ok ? '✅' : '❌'} |`);
}
if (!js.length || !css.length || !workers.length)
  throw new Error('Não achei os arquivos do build: rode pnpm build antes.');
if (failed) {
  console.error('\nOrçamento de tamanho estourado (apps/web/budget.json).');
  process.exit(1);
}
