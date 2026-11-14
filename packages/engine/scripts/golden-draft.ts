// Acrescenta aos golden sets, como RASCUNHO, as palavras mais frequentes de cada idioma que existem no dicionário,
// com a saída atual do motor preenchida. O revisor corrige e marca "revisado". Nunca altera linhas revisadas;
// nos rascunhos, troca o IPA pela variante que o estimador por regras prefere (espanhol, italiano: Fase 5).
// Uso: pnpm --filter @falagringo/engine golden:draft   (rode o `merge` do pacote de dados antes)
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frequencyList } from '../../data/scripts/lib/freq';
import { parseMerged } from '../../data/src/mergedTsv';
import { lookupKey } from '../../data/src/schema';
import { createRuleEstimator } from '../src/g2p/rules';
import { engineSyllabic, parseGolden, serializeGolden, type GoldenRow } from '../src/golden';
import type { Lang } from '../src/types';

const here = path.dirname(fileURLToPath(import.meta.url));
const MERGED = path.resolve(here, '../../data/build/merged');

/** Idioma → [lista de frequência, quantas palavras]. Inglês: 300 (meta da T3.7); demais: 200. */
const PLAN: [Lang, string, number][] = [
  ['en-US', 'en', 300], ['en-GB', 'en', 300], ['es-ES', 'es', 200], ['es-419', 'es', 200], ['fr-FR', 'fr', 200],
  ['it-IT', 'it', 200], ['de-DE', 'de', 200], ['nl-NL', 'nl', 100], ['sv-SE', 'sv', 100], ['ko-KR', 'ko', 100],
]; // prettier-ignore

for (const [lang, code, target] of PLAN) {
  const { entries } = parseMerged(await readFile(path.join(MERGED, `${lang}.tsv`), 'utf-8'));
  const variants = new Map<string, { word: string; ipa: string; rank: number }[]>();
  for (const e of entries) {
    const k = lookupKey(e.word, lang);
    (variants.get(k) ?? variants.set(k, []).get(k)!).push({ word: e.word, ipa: e.ipa, rank: e.rank });
  }
  const rules = createRuleEstimator();
  const primary = new Map<string, { word: string; ipa: string }>();
  for (const [k, vs] of variants) {
    vs.sort((a, b) => a.rank - b.rank);
    const pick =
      rules.prefer?.(
        k,
        lang,
        vs.map((v) => v.ipa),
      ) ?? 0;
    primary.set(k, vs[pick]);
  }

  const file = path.resolve(here, `../golden/${lang}.tsv`);
  const existing: GoldenRow[] = existsSync(file) ? parseGolden(await readFile(file, 'utf-8')).rows : [];
  let changed = 0;
  for (const row of existing) {
    const p = primary.get(lookupKey(row.word, lang));
    if (row.status !== 'rascunho' || !p || p.ipa === row.ipa || /\s/.test(p.ipa)) continue;
    row.ipa = p.ipa;
    row.expected = engineSyllabic(p.ipa, lang, row.word);
    row.note = 'variante escolhida pelas regras (a 1ª do dicionário era outra)';
    changed++;
  }
  const have = new Set(existing.map((r) => lookupKey(r.word, lang)));
  const added: GoldenRow[] = [];
  for (const [w] of await frequencyList(code)) {
    if (existing.length + added.length >= target) break;
    const key = lookupKey(w, lang);
    const p = primary.get(key);
    if (!p || have.has(key) || /\s/.test(p.ipa)) continue; // só palavras do dicionário, uma palavra de IPA
    have.add(key);
    added.push({
      word: p.word,
      ipa: p.ipa,
      expected: engineSyllabic(p.ipa, lang, p.word),
      status: 'rascunho',
      note: '',
    });
  }
  await writeFile(file, serializeGolden(lang, [...existing, ...added]));
  console.log(
    `${lang.padEnd(6)} ${existing.length} existentes (${changed} rascunhos com outra variante) + ${added.length} novos`,
  );
}
