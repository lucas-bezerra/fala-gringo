/**
 * Estimador por regras (Fase 5): idiomas de ortografia regular (espanhol, italiano, coreano, kana do japonês),
 * sem modelo nem download.
 * Além de estimar palavras fora do dicionário, escolhe a variante do dicionário mais próxima da pronúncia padrão
 * (`prefer`): o WikiPron lista as variantes na ordem da página do Wiktionary, e às vezes a 1ª é dialetal
 * (`la` → `a`, `por` → `po`).
 */
import type { Estimator } from '../stages';
import type { Lang } from '../types';
import { frenchToIpa } from './french';
import { italianToIpa } from './italian';
import { kanaToIpa, preferJapanese } from './japanese';
import { koreanToIpa } from './korean';
import { spanishToIpa } from './spanish';

/** IPA por regras, ou `undefined` se o idioma não tem regras ou a palavra tem símbolo estranho. */
export function ruleToIpa(key: string, lang: Lang): string | undefined {
  if (lang === 'es-ES' || lang === 'es-419') return spanishToIpa(key, lang);
  if (lang === 'it-IT') return italianToIpa(key);
  if (lang === 'fr-FR') return frenchToIpa(key);
  if (lang === 'ko-KR') return koreanToIpa(key);
  if (lang === 'ja-JP') return kanaToIpa(key); // só kana; kanji fica para o dicionário
  return undefined;
}

/** Idiomas em que as regras também ESTIMAM. No francês, só escolhem a variante (o modelo G2P estima melhor). */
const ESTIMATES = new Set<Lang>(['es-ES', 'es-419', 'it-IT', 'ko-KR', 'ja-JP']);
/** Idiomas em que a 1ª variante da fonte pode ser dialetal/reduzida (WikiPron). No italiano, a do Wiktionary já é
 *  a principal, e as regras só trocariam um padrão por outro (casa: ˈka.sa → ˈka.za). */
const PREFERS = new Set<Lang>(['es-ES', 'es-419', 'fr-FR']);

/** Forma de comparação: sem tônica, sílabas e ligações; ɡ unificado; e/o abertos = fechados (a grafia não diz). */
const comparable = (ipa: string) =>
  ipa
    .normalize('NFC')
    .replace(/[ˈˌ.‿]/gu, '')
    .replace(/g/gu, 'ɡ')
    .replace(/ɛ/gu, 'e')
    .replace(/ɔ/gu, 'o')
    .replace(/r/gu, 'ʁ')
    .replace(/œ/gu, 'ø');

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
    estimate: (key, lang) => (ESTIMATES.has(lang) ? ruleToIpa(key, lang) : undefined),
    prefer(key, lang, ipas) {
      if (ipas.length < 2) return undefined;
      if (lang === 'ja-JP') return preferJapanese(key, ipas); // leituras de kanji: lista curada
      if (!PREFERS.has(lang)) return undefined;
      const rule = ruleToIpa(key, lang);
      if (!rule) return undefined;
      const target = comparable(rule);
      let best = 0;
      let bestDist = Infinity;
      ipas.forEach((ipa, i) => {
        // forma de liaison ("bɔn‿") só como último recurso: a tela mostra a palavra isolada
        const d = editDistance(comparable(ipa), target) + (ipa.includes('‿') ? 1 : 0);
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
