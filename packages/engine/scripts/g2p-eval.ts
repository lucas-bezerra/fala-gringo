// Mede o modelo G2P (T3.9) onde importa: na GRAFIA PT-BR que a tela mostra, não só no IPA.
// Para cada palavra de teste (nunca vista no treino): IPA previsto → motor → grafia, comparada com a grafia de
// cada pronúncia do dicionário. Diferenças de notação que o motor absorve (pontos de sílaba, ɹ/r) deixam de contar.
// Precisa de tools/g2p/export/{idioma} e tools/g2p/data/{idioma}/test.tsv (fora do git; ver docs/treino-g2p.md).
// Uso: pnpm --filter @falagringo/engine g2p-eval [--limit N]
import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelInput } from '../src/g2p/estimator';
import { loadG2pModel, type G2pManifest } from '../src/g2p/model';
import { renderPronunciation } from '../src/phonology';
import type { Lang, Pronunciation } from '../src/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const G2P = path.resolve(here, '../../../tools/g2p');
const LANGS: Lang[] = ['en-US', 'en-GB', 'fr-FR', 'de-DE'];
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');
const fmt = (n: number) => n.toLocaleString('pt-BR');
/** Forma silabada com a tônica em maiúsculas (o que a tela mostra). */
const syllabic = (p: Pronunciation) => p.syllables.map((s) => s.text).join('·');
/** Sem sílabas nem tônica: só os sons escritos. */
const plain = (p: Pronunciation) =>
  p.syllables
    .map((s) => s.text)
    .join('')
    .toLocaleLowerCase('pt-BR');

const rows: string[] = [];
const examples: string[] = [];
for (const lang of LANGS) {
  const dir = path.join(G2P, 'export', lang);
  const testFile = path.join(G2P, 'data', lang, 'test.tsv');
  if (!existsSync(path.join(dir, 'g2p.bin')) || !existsSync(testFile)) {
    console.log(`${lang}: sem modelo ou sem dados de teste, pulando`);
    continue;
  }
  const manifest = JSON.parse(readFileSync(path.join(dir, 'g2p.json'), 'utf8')) as G2pManifest;
  const buf = readFileSync(path.join(dir, 'g2p.bin'));
  const model = loadG2pModel(
    manifest,
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  const tests = readFileSync(testFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .slice(0, limit)
    .map((l) => l.split('\t'));

  let ipaOk = 0;
  let sylOk = 0;
  let plainOk = 0;
  let refused = 0;
  let ms = 0;
  const misses: string[] = [];
  for (const [word, ...variants] of tests) {
    const input = modelInput(model, word);
    if (!input) {
      refused++;
      continue;
    }
    const t0 = performance.now();
    const ipa = model.predict(input);
    ms += performance.now() - t0;
    const got = renderPronunciation(ipa, lang, 'none', word);
    const refs = variants.map((v) => renderPronunciation(v, lang, 'dictionary', word));
    if (variants.includes(ipa)) ipaOk++;
    if (refs.some((r) => syllabic(r) === syllabic(got))) sylOk++;
    else if (misses.length < 12)
      misses.push(`${word}: modelo \`${syllabic(got)}\`, dicionário \`${syllabic(refs[0])}\``);
    if (refs.some((r) => plain(r) === plain(got))) plainOk++;
  }
  const n = tests.length;
  const done = n - refused;
  const mb = (buf.byteLength / 1e6).toFixed(1);
  rows.push(
    `| ${lang} | ${fmt(n)} | ${pct(ipaOk, n)} | **${pct(sylOk, n)}** | ${pct(plainOk, n)} | ${(ms / done).toFixed(0)} | ${mb} MB |`,
  );
  if (misses.length) examples.push(`- **${lang}:** ${misses.join('; ')}`);
  console.log(`${lang}: grafia ${pct(sylOk, n)} (IPA ${pct(ipaOk, n)}), ${refused} recusadas`);
}

const md = `# Modelo G2P — acerto na grafia PT-BR (T3.9)

> Gerado por \`pnpm --filter @falagringo/engine g2p-eval\`. Não edite à mão. Precisa dos modelos
> (\`tools/g2p/export\`) e dos dados de teste (\`tools/g2p/data\`), que ficam fora do git: veja
> [docs/treino-g2p.md](../../docs/treino-g2p.md). Decisão e contexto: [ADR 0004](../../docs/adr/0004-modelo-g2p.md).

Palavras de **teste**, que o modelo nunca viu no treino. A previsão passa pelo motor (como na tela) e conta como
certa se for igual a **alguma** das pronúncias do dicionário, também passadas pelo motor.

- **IPA idêntico:** a transcrição do modelo é igual, caractere a caractere. É a métrica do treino.
- **Grafia PT-BR:** a forma silabada com a tônica em maiúsculas é igual (ex.: \`â·KÂM·pâ·nist\`). É o que o usuário vê.
- **Sem tônica:** só os sons escritos são iguais (sílabas e tônica ignoradas).
- **ms/palavra:** inferência em TypeScript no Node, nesta máquina. No celular médio, conte ~4× mais.

| Idioma | Palavras | IPA idêntico | Grafia PT-BR | Sem tônica | ms/palavra | Modelo (float16) |
|---|--:|--:|--:|--:|--:|--:|
${rows.join('\n')}

${examples.length ? `## Exemplos de diferença na grafia\n\n${examples.join('\n')}\n` : ''}`;
await writeFile(path.resolve(here, '../G2P.md'), md);
console.log(md);
