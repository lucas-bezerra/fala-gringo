/**
 * Posiciona as marcas de tônica do inglês no INÍCIO da sílaba (convenção IPA).
 *
 * CMUdict e Britfone marcam a tônica na vogal (`W AO1 T ER0`, `w ˈɔː t ə`); o IPA a põe antes da
 * sílaba. A fronteira é achada pelo princípio do ataque máximo com os encontros iniciais do inglês.
 */

export interface Segment {
  /** Som em IPA (ex.: "tʃ", "ɔː"). */
  ipa: string;
  /** Tônica da vogal: 1 = primária, 2 = secundária, 0 = átona; `null` = consoante. */
  stress: 0 | 1 | 2 | null;
}

/** Encontros consonantais permitidos em início de sílaba no inglês (US e UK). */
const LEGAL_CLUSTERS = new Set([
  'p ɹ', 'p l', 'p j', 'b ɹ', 'b l', 'b j', 't ɹ', 't w', 't j', 'd ɹ', 'd w', 'd j',
  'k ɹ', 'k l', 'k w', 'k j', 'ɡ ɹ', 'ɡ l', 'ɡ w', 'ɡ j', 'f ɹ', 'f l', 'f j',
  'θ ɹ', 'θ w', 'ʃ ɹ', 'v j', 'm j', 'n j', 'h j',
  's l', 's w', 's p', 's t', 's k', 's m', 's n', 's f', 's j',
  's p ɹ', 's p l', 's p j', 's t ɹ', 's t j', 's k ɹ', 's k w', 's k l', 's k j',
]); // prettier-ignore

/** Encontro permitido em início de sílaba no inglês (bases IPA sem ligadura: "tʃ", "ɹ"). Usado também pelo motor (T3.4). */
export function isLegalOnset(cluster: string[]): boolean {
  if (cluster.length === 0) return true;
  if (cluster.length === 1) return cluster[0] !== 'ŋ';
  return LEGAL_CLUSTERS.has(cluster.join(' '));
}

/** Junta os segmentos em IPA, com `ˈ`/`ˌ` antes do ataque da sílaba tônica. */
export function joinWithStress(segments: readonly Segment[]): string {
  const marks = new Map<number, string>();
  let prevVowel = -1;
  segments.forEach((s, i) => {
    if (s.stress === null) return;
    if (s.stress > 0) {
      let onsetStart = 0; // primeira sílaba: todas as consoantes iniciais são ataque
      if (prevVowel >= 0) {
        const consonants = segments.slice(prevVowel + 1, i).map((c) => c.ipa);
        onsetStart = i;
        for (let k = 0; k <= consonants.length; k++) {
          if (isLegalOnset(consonants.slice(k))) {
            onsetStart = prevVowel + 1 + k;
            break;
          }
        }
      }
      marks.set(onsetStart, s.stress === 1 ? 'ˈ' : 'ˌ');
    }
    prevVowel = i;
  });
  return segments.map((s, i) => (marks.get(i) ?? '') + s.ipa).join('');
}
