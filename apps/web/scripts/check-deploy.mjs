// Confere um site publicado (T6.6): cabeçalhos de segurança e de cache por tipo de arquivo, service worker e dados.
// Uso: pnpm check:deploy https://falagringo.onrender.com
// Só lê (GET); não envia texto nenhum.
const base = process.argv[2]?.replace(/\/$/, '');
if (!base?.startsWith('https://') && !base?.startsWith('http://localhost')) {
  console.error('Uso: pnpm check:deploy https://<endereço do site>');
  process.exit(2);
}

const results = [];
const check = (label, ok, detail = '') => results.push({ label, ok, detail });

async function get(path) {
  const res = await fetch(base + path, { redirect: 'manual', headers: { 'Accept-Encoding': 'gzip, br' } });
  return { res, h: (n) => res.headers.get(n) ?? '' };
}

const home = await get('/');
check('Página inicial responde 200', home.res.status === 200, `HTTP ${home.res.status}`);
const csp = home.h('content-security-policy');
for (const d of [
  "default-src 'none'",
  "script-src 'self'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
]) {
  check(`CSP tem ${d}`, csp.includes(d));
}
check('HSTS', home.h('strict-transport-security').includes('max-age='));
check('X-Content-Type-Options: nosniff', home.h('x-content-type-options') === 'nosniff');
check('X-Frame-Options: DENY', home.h('x-frame-options') === 'DENY');
check('Referrer-Policy: no-referrer', home.h('referrer-policy') === 'no-referrer');
check('Cross-Origin-Resource-Policy', home.h('cross-origin-resource-policy') === 'same-origin');
check('Permissions-Policy', home.h('permissions-policy').includes('camera=()'));

const html = await home.res.text();
const asset = html.match(/\/assets\/[^"]+\.js/)?.[0];
if (asset) {
  const a = await get(asset);
  check('JS com hash: cache imutável', a.h('cache-control').includes('immutable'), a.h('cache-control'));
  check(
    'JS comprimido',
    /gzip|br/.test(a.h('content-encoding')),
    a.h('content-encoding') || 'sem compressão',
  );
}

const sw = await get('/sw.js');
check('sw.js responde 200', sw.res.status === 200, `HTTP ${sw.res.status}`);
check('sw.js sem cache', /no-cache|max-age=0/.test(sw.h('cache-control')), sw.h('cache-control'));

const man = await get('/dict/manifest.json');
check(
  'manifest dos dados sem cache',
  /no-cache|max-age=0/.test(man.h('cache-control')),
  man.h('cache-control'),
);
const manifest = await man.res.json();
const lang = Object.keys(manifest.langs)[0];
const shard = manifest.langs[lang].shards[0].file;
const sh = await get(`/dict/${shard}`);
check(`shard (${lang}) responde 200`, sh.res.status === 200, `HTTP ${sh.res.status}`);
check('shard com cache imutável', sh.h('cache-control').includes('immutable'), sh.h('cache-control'));
check(
  'shard comprimido',
  /gzip|br/.test(sh.h('content-encoding')),
  sh.h('content-encoding') || 'sem compressão',
);

const pwa = await get('/manifest.webmanifest');
check('manifest do PWA responde 200', pwa.res.status === 200, `HTTP ${pwa.res.status}`);

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? '✅' : '❌'} ${r.label}${r.detail ? ` — ${r.detail}` : ''}`);
}
console.log(
  `\n${results.length - failed}/${results.length} verificações ok (dados ${manifest.dataVersion}).`,
);
process.exit(failed ? 1 : 0);
