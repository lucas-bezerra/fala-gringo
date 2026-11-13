/**
 * Léxico do português (T3.2) — usado pelo motor no modo "texto misto" para NÃO converter palavras em português.
 * Puro (sem Node): o motor importa PT_CORE daqui.
 *
 * Nenhuma fonte diz sozinha o que é português (ver docs da T3.2 em packages/data/LEXICON.md):
 *  - WikiPron PT-BR (minúsculas) é dicionário de verdade, mas não tem flexões ("correspondentes", até "a");
 *  - a lista de frequência de legendas pt-BR tem flexões, mas também "the", "you", "massachusetts"…
 * Combinação: WikiPron ∪ top 30 mil das legendas − ruído estrangeiro − nomes próprios, + PT_CORE.
 */

/** Palavras funcionais do português: sempre no léxico, nunca "ruído" (das, de, no, la… existem em outras línguas). */
export const PT_CORE: readonly string[] = [
  'a', 'à', 'ao', 'aos', 'as', 'às', 'o', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'dum', 'duma', 'em', 'no', 'na', 'nos', 'nas', 'num', 'numa',
  'por', 'pelo', 'pela', 'pelos', 'pelas', 'para', 'pra', 'pro', 'com', 'sem', 'sob', 'sobre', 'entre', 'até',
  'desde', 'contra', 'perante', 'após', 'e', 'ou', 'mas', 'nem', 'que', 'se', 'como', 'quando', 'porque',
  'pois', 'porém', 'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas', 'me', 'te', 'lhe', 'nos', 'vos',
  'lhes', 'meu', 'minha', 'teu', 'tua', 'seu', 'sua', 'nosso', 'nossa', 'este', 'esta', 'esse', 'essa',
  'aquele', 'aquela', 'isto', 'isso', 'aquilo', 'não', 'sim', 'já', 'mais', 'menos', 'muito', 'pouco',
  'bem', 'mal', 'lá', 'cá', 'aqui', 'ali', 'é', 'são', 'foi', 'ser', 'estar', 'está', 'estão', 'tem', 'têm',
  'ter', 'há', 'vai', 'vão', 'era', 'todo', 'toda', 'todos', 'todas', 'outro', 'outra', 'mesmo', 'mesma',
]; // prettier-ignore

/** Formato publicado: palavras comuns, uma por linha; depois a linha `#names` e os nomes próprios. */
export const NAMES_SEPARATOR = '#names';

export function serializePtLexicon(lex: Pick<PtLexicon, 'words' | 'names'>): string {
  return [...lex.words, NAMES_SEPARATOR, ...lex.names].join('\n') + '\n';
}

export function parsePtLexicon(text: string): { words: Set<string>; names: Set<string> } {
  const lines = text.split('\n').filter(Boolean);
  const sep = lines.indexOf(NAMES_SEPARATOR);
  return {
    words: new Set(sep < 0 ? lines : lines.slice(0, sep)),
    names: new Set(sep < 0 ? [] : lines.slice(sep + 1)),
  };
}

export interface PtLexiconInput {
  /** Lista de frequência pt-BR, da mais frequente para a menos (palavras em minúsculas). */
  ptFrequency: readonly string[];
  /** Listas de frequência de outros idiomas, na mesma ordem (para detectar ruído estrangeiro). */
  otherFrequency: Readonly<Record<string, readonly string[]>>;
  /** Palavras do WikiPron PT-BR, com a grafia original (maiúsculas = nome próprio). */
  wikipronWords: readonly string[];
  /** Quantas palavras da lista pt-BR usar (padrão 30.000). */
  ptTop?: number;
  /** Até que posição das outras listas procurar ruído (padrão 3.000). */
  foreignTop?: number;
  /** Ruído = posição na outra língua × `ratio` < posição no português (padrão 10). */
  ratio?: number;
}

export interface PtLexicon {
  /** Palavras comuns (minúsculas). */
  words: string[];
  /** Nomes próprios do português (WikiPron PT-BR com maiúscula, em minúsculas): Londres, Alemanha, Munique… */
  names: string[];
  /** Palavras da lista pt-BR descartadas por serem muito mais frequentes em outra língua. */
  noise: string[];
  /** Palavras descartadas por só existirem como nome próprio no WikiPron PT-BR. */
  properOnly: string[];
}

export function buildPtLexicon(input: PtLexiconInput): PtLexicon {
  const { ptTop = 30_000, foreignTop = 3_000, ratio = 10 } = input;
  const norm = (w: string) => w.normalize('NFC').toLocaleLowerCase('pt-BR');

  const dictionaryWords = new Set<string>(); // WikiPron, minúsculas: palavras comuns de dicionário
  const properNames = new Set<string>(); // WikiPron, com maiúscula: nomes próprios
  for (const w of input.wikipronWords) {
    if (w === w.toLocaleLowerCase('pt-BR')) dictionaryWords.add(norm(w));
    else properNames.add(norm(w));
  }

  const foreignRank = new Map<string, number>(); // melhor posição em qualquer outra língua
  for (const list of Object.values(input.otherFrequency)) {
    list.slice(0, foreignTop).forEach((w, i) => {
      const k = norm(w);
      if (!foreignRank.has(k) || foreignRank.get(k)! > i) foreignRank.set(k, i);
    });
  }

  const core = new Set(PT_CORE);
  const words = new Set<string>([...dictionaryWords, ...core]);
  const noise: string[] = [];
  const properOnly: string[] = [];
  input.ptFrequency.slice(0, ptTop).forEach((raw, rank) => {
    const w = norm(raw);
    if (!w || /[\d\s]/u.test(w) || words.has(w)) return;
    const fr = foreignRank.get(w);
    if (fr !== undefined && fr * ratio < rank && !core.has(w)) {
      noise.push(w);
      return;
    }
    if (properNames.has(w) && !dictionaryWords.has(w)) {
      properOnly.push(w); // ex.: "massachusetts" — nome próprio, não palavra comum
      return;
    }
    words.add(w);
  });

  const names = [...properNames].filter((n) => !words.has(n)).sort();
  return { words: [...words].sort(), names, noise, properOnly };
}
