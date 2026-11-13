// Baixa do Wikidata (CC0) as transcrições IPA (P898) de itens, com idioma (P407) e rótulo nesse idioma.
// Salva um retrato fixo em raw/wikidata/p898.tsv (versionado) — a importação (import:wikidata) lê só o retrato.
//
// O serviço público de consultas tem limite de 60 s por consulta e cota de uso por minuto. Por isso:
//  - a consulta é dividida em etapas leves (IPA por item de idioma; depois rótulos/tipos em lotes);
//  - cada idioma concluído vai para um cache (build/wikidata-cache/) e é pulado se o script for rodado de novo;
//  - 429 respeita o Retry-After; 5xx e respostas truncadas tentam de novo com espera crescente.
// Uso: pnpm --filter @falagringo/data fetch:wikidata   (apague build/wikidata-cache/ para buscar tudo de novo)
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DATA_ROOT } from './lib/write';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'falagringo-data-pipeline/0.1 (open-source pronunciation tool)';
const CACHE_DIR = path.join(DATA_ROOT, 'build/wikidata-cache');
const HEADER = 'qid\tcode\tlabel\tipa\thuman\tplace\tclub';

/** Código Wikimedia do idioma da pronúncia (P424) → idioma do rótulo. */
const CODES: Record<string, string> = {
  en: 'en', 'en-us': 'en', 'en-gb': 'en', es: 'es', fr: 'fr', de: 'de',
  it: 'it', ja: 'ja', ko: 'ko', zh: 'zh', nl: 'nl', sv: 'sv',
}; // prettier-ignore

/** Classes de clube/time esportivo (P31 direto). */
const CLUB_CLASSES = ['Q476028', 'Q847017', 'Q12973014', 'Q13393265'];
const BATCH = 200;

/** Etapa 1: itens e IPA de UM item de idioma (QID fixo — formato medido em ~6 s). */
const ipaQuery = (langQid: string) => `
SELECT ?item ?ipa WHERE {
  ?item p:P898 ?st .
  ?st ps:P898 ?ipa ; pq:P407 wd:${langQid} .
  FILTER(STRSTARTS(STR(?item), "http://www.wikidata.org/entity/Q"))
}`;

/** Etapa 2: rótulo no idioma e tipo (pessoa, lugar, clube) de um lote de itens conhecidos. */
const detailsQuery = (qids: string[], labelLang: string) => `
SELECT ?item ?label ?human ?place ?club WHERE {
  VALUES ?item { ${qids.map((q) => `wd:${q}`).join(' ')} }
  ?item rdfs:label ?label . FILTER(LANG(?label) = "${labelLang}")
  BIND(EXISTS { ?item wdt:P31 wd:Q5 } AS ?human)
  BIND(EXISTS { ?item wdt:P625 [] } AS ?place)
  BIND(EXISTS { ?item wdt:P31 ?t . VALUES ?t { ${CLUB_CLASSES.map((q) => `wd:${q}`).join(' ')} } } AS ?club)
}`;

interface Binding {
  [key: string]: { value: string } | undefined;
}

const clean = (s: string) => s.replace(/[\t\r\n]+/g, ' ').trim();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const qidOf = (b: Binding, key: string) => b[key]!.value.split('/').pop()!;

async function sparql(text: string): Promise<Binding[]> {
  const url = `${ENDPOINT}?query=${encodeURIComponent(text)}`;
  const MAX = 6;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    });
    let problem: string;
    let wait = 15_000 * attempt;
    if (res.ok) {
      const body = await res.text();
      try {
        return (JSON.parse(body) as { results: { bindings: Binding[] } }).results.bindings;
      } catch {
        problem = 'resposta truncada (tempo esgotado no servidor)';
      }
    } else if (res.status === 429) {
      problem = 'HTTP 429 (cota excedida)';
      wait = Math.max(wait, (Number(res.headers.get('retry-after')) || 60) * 1000);
    } else if (res.status >= 500) {
      problem = `HTTP ${res.status}`;
    } else {
      throw new Error(`Wikidata respondeu ${res.status}`);
    }
    if (attempt === MAX) throw new Error(`Wikidata falhou ${MAX} vezes: ${problem}`);
    console.warn(`  ${problem}; nova tentativa em ${Math.round(wait / 1000)}s`);
    await sleep(wait);
  }
}

await mkdir(CACHE_DIR, { recursive: true });

// Itens de idioma de cada código (consulta barata).
const codeList = Object.keys(CODES)
  .map((c) => `"${c}"`)
  .join(' ');
const qidsByCode = new Map<string, string[]>();
for (const b of await sparql(
  `SELECT ?lang ?code WHERE { VALUES ?code { ${codeList} } ?lang wdt:P424 ?code }`,
)) {
  const code = b.code!.value;
  qidsByCode.set(code, [...(qidsByCode.get(code) ?? []), qidOf(b, 'lang')]);
}

for (const [code, labelLang] of Object.entries(CODES)) {
  const cacheFile = path.join(CACHE_DIR, `${code}.tsv`);
  if (existsSync(cacheFile)) {
    console.log(`${code.padEnd(6)} (cache)`);
    continue;
  }
  const langQids = qidsByCode.get(code) ?? [];
  if (langQids.length === 0) console.warn(`${code.padEnd(6)} sem item de idioma no Wikidata`);

  const ipaRows: { qid: string; ipa: string }[] = [];
  for (const langQid of langQids) {
    for (const b of await sparql(ipaQuery(langQid)))
      ipaRows.push({ qid: qidOf(b, 'item'), ipa: clean(b.ipa!.value) });
    await sleep(1000);
  }

  const itemQids = [...new Set(ipaRows.map((r) => r.qid))];
  const details = new Map<string, { label: string; flags: string[] }>();
  for (let i = 0; i < itemQids.length; i += BATCH) {
    for (const b of await sparql(detailsQuery(itemQids.slice(i, i + BATCH), labelLang))) {
      const flag = (k: string) => (b[k]?.value === 'true' ? '1' : '0');
      details.set(qidOf(b, 'item'), {
        label: clean(b.label!.value),
        flags: [flag('human'), flag('place'), flag('club')],
      });
    }
    await sleep(1000);
  }

  const rows = ipaRows.flatMap((r) => {
    const d = details.get(r.qid);
    return d ? [[r.qid, code, d.label, r.ipa, ...d.flags].join('\t')] : []; // sem rótulo no idioma: fora
  });
  await writeFile(cacheFile, rows.map((r) => r + '\n').join(''));
  console.log(`${code.padEnd(6)} ${ipaRows.length} transcrições, ${rows.length} com rótulo no idioma`);
  await sleep(2000);
}

// Monta o retrato a partir do cache, em ordem estável.
const all: string[] = [];
for (const code of Object.keys(CODES)) {
  const cacheFile = path.join(CACHE_DIR, `${code}.tsv`);
  if (existsSync(cacheFile)) all.push(...(await readFile(cacheFile, 'utf-8')).split('\n').filter(Boolean));
}
all.sort();
const out = path.join(DATA_ROOT, 'raw/wikidata/p898.tsv');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, [HEADER, ...all].join('\n') + '\n');
console.log(
  `\n${all.length} linhas → ${path.relative(process.cwd(), out)} (${new Date().toISOString().slice(0, 10)})`,
);
