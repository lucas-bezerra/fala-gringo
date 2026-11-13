// Mede a silabação e as regras de tônica (T3.4) contra os dados que JÁ têm a informação:
//  - fronteiras: pronúncias com "." da fonte → apaga os pontos, silaba, compara;
//  - tônica por regra: pronúncias com ˈ → apaga as marcas, aplica a regra do idioma, compara.
// Uso: pnpm --filter @falagringo/engine syllables-eval   (rode o `merge` do pacote de dados antes)
import { readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMerged } from '../../data/src/mergedTsv';
import type { Lang } from '../src/types';
import { parseIpa, type IpaToken } from '../src/ipa/parse';
import { NO_STRESS, syllabify } from '../src/ipa/syllabify';

const here = path.dirname(fileURLToPath(import.meta.url));
const MERGED = path.resolve(here, '../../data/build/merged');
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—');
const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Tamanho (em sons) de cada sílaba — compara fronteiras independentemente de marcas. */
const shape = (tokens: IpaToken[], lang: Lang, word?: string) =>
  syllabify(tokens, lang, { word }).words.flatMap((w) =>
    w.syllables.map((s) => s.onset.length + s.nucleus.length + s.coda.length),
  );
const goldShape = (tokens: IpaToken[]) => {
  const sizes: number[] = [0];
  for (const t of tokens) {
    if (t.kind === 'syllable' && sizes[sizes.length - 1] > 0) sizes.push(0);
    else if (t.kind === 'phone') sizes[sizes.length - 1]++;
  }
  return sizes;
};

const boundaryRows: string[] = [];
const stressRows: string[] = [];
const boundaryMisses: string[] = [];
const stressMisses: string[] = [];

for (const file of readdirSync(MERGED)
  .filter((f) => f.endsWith('.tsv'))
  .sort()) {
  const { lang, entries } = parseMerged(await readFile(path.join(MERGED, file), 'utf-8'));
  let bTotal = 0;
  let bOk = 0;
  const bEx: string[] = [];
  let sTotal = 0;
  const sOk = { regra: 0, primeira: 0, penúltima: 0, última: 0 };
  const sEx: string[] = [];

  for (const e of entries) {
    if (e.rank !== 0 || e.ipa.includes(' ')) continue;
    const tokens = parseIpa(e.ipa, lang);

    // Fronteiras
    if (e.ipa.includes('.')) {
      const gold = goldShape(tokens);
      const pred = shape(
        tokens.filter((t) => t.kind !== 'syllable'),
        lang,
      );
      if (gold.length === pred.length) {
        bTotal++;
        if (gold.every((g, i) => g === pred[i])) bOk++;
        else if (bEx.length < 6) bEx.push(`${e.word} /${e.ipa}/`);
      }
    }

    // Tônica por regra
    if (!NO_STRESS.has(lang) && e.stress === 'marked' && e.ipa.includes('ˈ')) {
      const marked = syllabify(tokens, lang).words[0]?.syllables ?? [];
      const gold = marked.findIndex((s) => s.stress === 1);
      if (marked.length < 2 || gold < 0) continue;
      const bare = tokens.filter((t) => t.kind !== 'stress');
      const ruled = syllabify(bare, lang, { word: e.word, stress: 'none' }).words[0]?.syllables ?? [];
      if (ruled.length !== marked.length) continue;
      sTotal++;
      const pred = ruled.findIndex((s) => s.stress === 1);
      if (pred === gold) sOk.regra++;
      else if (sEx.length < 6) sEx.push(`${e.word} /${e.ipa}/`);
      if (gold === 0) sOk.primeira++;
      if (gold === marked.length - 2) sOk.penúltima++;
      if (gold === marked.length - 1) sOk.última++;
    }
  }

  if (bTotal) {
    boundaryRows.push(`| ${lang} | ${fmt(bTotal)} | **${pct(bOk, bTotal)}** |`);
    boundaryMisses.push(`- **${lang}:** ${bEx.join('; ')}`);
  }
  if (sTotal) {
    stressRows.push(
      `| ${lang} | ${fmt(sTotal)} | **${pct(sOk.regra, sTotal)}** | ${pct(sOk.primeira, sTotal)} | ${pct(sOk.penúltima, sTotal)} | ${pct(sOk.última, sTotal)} |`,
    );
    stressMisses.push(`- **${lang}:** ${sEx.join('; ')}`);
  }
}

const md = `# Silabação e tônica — medição (T3.4)

> Gerado por \`pnpm --filter @falagringo/engine syllables-eval\`. Não edite à mão. Regras em [src/ipa/syllabify.ts](src/ipa/syllabify.ts).

## Fronteiras de sílaba (ataque máximo × "." da fonte)

Pronúncias principais, de uma palavra, que trazem "." da fonte e o mesmo número de sílabas nos dois lados. Acerto = todas as fronteiras iguais.

| Idioma | Palavras | Acerto |
|---|---|---|
${boundaryRows.join('\n')}

**Como ler:**
- **en-GB / en-US:** o inglês ignora o "." da fonte DE PROPÓSITO. O Wiktionary segue a convenção de Wells (consoante na sílaba tônica de vogal breve: "ˈæb.ə"), o CMUdict e o Britfone não têm pontos; o motor usa sempre o ataque máximo ("ˈæ.bə", como o brasileiro lê). A linha mede o quanto as duas convenções divergem, não um erro.
- **nl-NL:** os erros que sobram são fronteiras de palavras compostas ("aal|elger", "aagt|appel"), que só a morfologia resolve. Na prática o holandês sempre traz "." da fonte, e a regra só entra quando ele falta.
- Encontro inicial = obstruinte (ou nasal antes de semivogal) + líquida/semivogal. Entre vogais, s + consoante NÃO abre sílaba (italiano 95,5% → 99,8% ao retirar essa permissão); exceção: ʃ + oclusiva no alemão (be·stimmt, Ge·spräch), não mensurável aqui porque o alemão não traz pontos.

Primeiros erros por idioma:

${boundaryMisses.join('\n')}

## Tônica por regra (quando a fonte não marca)

Pronúncias principais polissílabas COM tônica marcada: apaga-se a marca, aplica-se a regra e compara-se. As colunas seguintes mostram quanto acertaria cada regra fixa — base para escolher a regra de cada idioma.

| Idioma | Palavras | Regra atual | Sempre a 1ª | Sempre a penúltima | Sempre a última |
|---|---|---|---|---|---|
${stressRows.join('\n')}

**Regras adotadas (escolhidas por esta medição):**
- **Inglês:** sufixos pela grafia (-tion/-ic → sílaba anterior; -ity/-ical → antepenúltima; -ee/-esque → última) + 1ª sílaba não reduzida. Era 67,7% (en-US) e 54,4% (en-GB) com "sempre a 1ª".
- **Alemão, holandês, sueco:** 1ª sílaba não reduzida (pula be-/ge-/ver-, a-).
- **Italiano:** penúltima. **Francês:** última. **Espanhol:** ortografia (acento gráfico; senão terminada em vogal/n/s → penúltima, senão última) — a amostra com tônica marcada é pequena (só o Wikidata) e o único erro é um dado errado da fonte ("Cuidad de Roxas" /ˈroxas/); a regra é coberta por testes unitários.
- Nos idiomas com tônica marcada na fonte (en, de, it, nl, sv), a regra só entra para as palavras sem marca; o motor informa \`stress: 'rule'\` para a interface sinalizar confiança menor.

Primeiros erros da regra atual:

${stressMisses.join('\n')}
`;
await writeFile(path.resolve(here, '../SYLLABLES.md'), md);
console.log(md);
