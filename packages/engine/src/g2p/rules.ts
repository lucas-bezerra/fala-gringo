/**
 * Estimador por regras (Fase 5): idiomas de ortografia regular (espanhol, italiano), sem modelo nem download.
 * Além de estimar palavras fora do dicionário, escolhe a variante do dicionário mais próxima da pronúncia padrão
 * (`prefer`): o WikiPron lista as variantes na ordem da página do Wiktionary, e às vezes a 1ª é dialetal
 * (`la` → `a`, `por` → `po`).
 */
import type { Estimator } from '../stages';
import type { Lang } from '../types';
import { italianToIpa } from './italian';
import { spanishToIpa } from './spanish';

/** IPA por regras, ou `undefined` se o idioma não tem regras ou a palavra tem símbolo estranho. */
export function ruleToIpa(key: string, lang: Lang): string | undefined {
  if (lang === 'es-ES' || lang === 'es-419') return spanishToIpa(key, lang);
  if (lang === 'it-IT') return italianToIpa(key);
  return undefined;
}

/** Forma de comparação: sem tônica, sílabas e ligações; ɡ unificado; e/o abertos = fechados (a grafia não diz). */
const comparable = (ipa: string) =>
  ipa
    .normalize('NFC')
    .replace(/[ˈˌ.‿]/gu, '')
    .replace(/g/gu, 'ɡ')
    .replace(/ɛ/gu, 'e')
    .replace(/ɔ/gu, 'o');

function editDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length];
}

export function createRuleEstimator(): Estimator {
  return {
    estimate: ruleToIpa,
    prefer(key, lang, ipas) {
      if (ipas.length < 2) return undefined;
      const rule = ruleToIpa(key, lang);
      if (!rule) return undefined;
      const target = comparable(rule);
      let best = 0;
      let bestDist = Infinity;
      ipas.forEach((ipa, i) => {
        const d = editDistance(comparable(ipa), target);
        if (d < bestDist) [best, bestDist] = [i, d]; // empate: fica a ordem do dicionário
      });
      return best;
    },
  };
}

/** Encadeia estimadores: o primeiro que souber responder vence (regras antes do modelo, que exige download). */
export function chainEstimators(...estimators: (Estimator | undefined)[]): Estimator {
  const list = estimators.filter((e): e is Estimator => !!e);
  return {
    async estimate(key, lang) {
      for (const e of list) {
        const ipa = await e.estimate(key, lang);
        if (ipa) return ipa;
      }
      return undefined;
    },
    prefer(key, lang, ipas) {
      for (const e of list) {
        const i = e.prefer?.(key, lang, ipas);
        if (i !== undefined) return i;
      }
      return undefined;
    },
  };
}
