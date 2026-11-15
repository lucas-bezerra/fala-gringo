/**
 * Coreano: Hangul → IPA por regras (T5.6). O dicionário cobre só 44,5% do uso (faltam as formas flexionadas:
 * 있어요, 어떻게), então a conversão por regra é o caminho principal para o resto.
 *
 * Regras da pronúncia padrão, entre a coda de uma sílaba e o ataque da seguinte:
 *   ligação (coda + ㅇ: a consoante passa para a sílaba seguinte; 있어 → 이써), palatalização (굳이 → 구지),
 *   aspiração com ㅎ (좋다 → 조타, 축하 → 추카), nasalização (국물 → 궁물), liquidização (신라 → 실라),
 *   ㄹ → ㄴ depois de ㅁ/ㅇ (침략 → 침냑), tensificação depois de obstruinte (학교 → 학꾜), neutralização da coda.
 * Saída no estilo do dicionário (Wiktionary): sonoras entre sons sonoros (ɡ d b d͡ʑ), tensas com ͈, aspiradas com
 * ʰ, ㅅ como sʰ (ɕʰ antes de i/j), ㄹ como ɾ no ataque e l na coda. Diacríticos de vogal ficam de fora (o motor
 * usa a base).
 */

const S_BASE = 0xac00;
const S_LAST = 0xd7a3;

// índices do Unicode: inicial (19), vogal (21), final (28)
const INITIALS = [
  'g',
  'kk',
  'n',
  'd',
  'tt',
  'r',
  'm',
  'b',
  'pp',
  's',
  'ss',
  '',
  'j',
  'jj',
  'ch',
  'k',
  't',
  'p',
  'h',
];
const VOWELS = [
  'a', 'ɛ', 'ja', 'jɛ', 'ʌ', 'e', 'jʌ', 'je', 'o', 'wa', 'wɛ', 'we', 'jo', 'u', 'wʌ', 'we', 'ɥi', 'ju', 'ɯ', 'ɰi', 'i',
]; // prettier-ignore
/** Finais (índice 1–27) como [1ª consoante, 2ª consoante] em letras romanas internas. */
const FINALS: (string[] | undefined)[] = [
  undefined, ['g'], ['kk'], ['g', 's'], ['n'], ['n', 'j'], ['n', 'h'], ['d'], ['r'], ['r', 'g'], ['r', 'm'],
  ['r', 'b'], ['r', 's'], ['r', 't'], ['r', 'p'], ['r', 'h'], ['m'], ['b'], ['b', 's'], ['s'], ['ss'], ['ng'],
  ['j'], ['ch'], ['k'], ['t'], ['p'], ['h'],
]; // prettier-ignore

/** Neutralização da coda: as 7 consoantes possíveis no fim da sílaba. */
const NEUTRAL: Record<string, string> = {
  g: 'K', kk: 'K', k: 'K', n: 'N', d: 'T', t: 'T', s: 'T', ss: 'T', j: 'T', ch: 'T', h: 'T',
  r: 'L', m: 'M', b: 'P', p: 'P', ng: 'NG',
}; // prettier-ignore
/** Coda dupla antes de consoante: qual das duas soa (ㄺ → ㄱ, ㄼ → ㄹ, ㄻ → ㅁ…). */
function simplify(f: string[]): string {
  if (f.length === 1) return f[0];
  const [a, b] = f;
  if (a === 'r' && (b === 'g' || b === 'm' || b === 'p')) return b; // 닭 → 닥, 삶 → 삼, 읊 → 읍
  return a; // 넋 → 넉, 앉 → 안, 값 → 갑, 여덟 → 여덜
}

const ASPIRATE: Record<string, string> = { g: 'k', d: 't', b: 'p', j: 'ch' };
const TENSE: Record<string, string> = { g: 'kk', d: 'tt', b: 'pp', s: 'ss', j: 'jj' };

interface Syl {
  onset: string; // letras internas ('' = ㅇ)
  vowel: string; // IPA
  coda: string[]; // 0, 1 ou 2 letras internas
}

/** `undefined` se a palavra tiver algo além de sílabas Hangul completas. */
export function koreanToIpa(word: string): string | undefined {
  const syls: Syl[] = [];
  for (const ch of word.normalize('NFC')) {
    const cp = ch.codePointAt(0)!;
    if (cp < S_BASE || cp > S_LAST) return undefined;
    const idx = cp - S_BASE;
    syls.push({
      onset: INITIALS[Math.floor(idx / 588)],
      vowel: VOWELS[Math.floor((idx % 588) / 28)],
      coda: [...(FINALS[idx % 28] ?? [])],
    });
  }
  if (!syls.length) return undefined;

  /** Coda que sobrou (depois da ligação ou do ㅎ) ainda em letras: neutraliza. */
  const settle = (x: Syl) => {
    if (x.coda.length && x.coda[0] !== x.coda[0].toUpperCase()) x.coda = [NEUTRAL[simplify(x.coda)] ?? ''];
  };

  // ---- regras entre sílabas (sobre letras internas; a coda vira maiúscula quando neutralizada)
  for (let i = 0; i < syls.length - 1; i++) {
    const a = syls[i];
    const b = syls[i + 1];
    if (!a.coda.length) continue;
    rules(a, b);
    settle(a);
  }
  const lastSyl = syls[syls.length - 1];
  settle(lastSyl);
  return render(syls);
}

function rules(a: Syl, b: Syl): void {
  {
    const last = a.coda[a.coda.length - 1];

    if (b.onset === '') {
      // ligação: a (última) consoante da coda vai para a sílaba seguinte; ㅎ cai; ㅇ fica
      if (last === 'ng') return;
      a.coda.pop();
      if (last === 'h') return;
      // palatalização: ㄷ/ㅌ + 이 → ㅈ/ㅊ
      b.onset = b.vowel === 'i' && (last === 'd' || last === 't') ? (last === 'd' ? 'j' : 'ch') : last;
      return;
    }
    // ㅎ na coda (ㅎ, ㄶ, ㅀ): aspira a consoante seguinte; antes de ㅅ, tensa; antes de ㄴ, vira ㄴ
    if (last === 'h') {
      a.coda.pop();
      if (ASPIRATE[b.onset]) b.onset = ASPIRATE[b.onset];
      else if (b.onset === 's') b.onset = 'ss';
      else if (b.onset === 'n' && !a.coda.length) a.coda = ['n'];
      return;
    }
    const c = NEUTRAL[simplify(a.coda)];
    a.coda = [c];
    // ㅎ no ataque depois de obstruinte: aspiração (축하 → 추카, 입학 → 이팍)
    if (b.onset === 'h' && (c === 'K' || c === 'T' || c === 'P')) {
      a.coda = [];
      b.onset = c === 'K' ? 'k' : c === 'T' ? 't' : 'p';
      return;
    }
    // ㄹ + ㅎ: o ㄹ passa para o ataque como tepe ("건설하다" → 건서라다, ɾh no dicionário)
    if (b.onset === 'h' && c === 'L') {
      a.coda = [];
      b.onset = 'rh';
      return;
    }
    // ㄹ depois de consoante que não é ㄹ/ㄴ vira ㄴ (침략 → 침냑; 국립 → 국닙 → 궁닙)
    if (b.onset === 'r' && c !== 'L' && c !== 'N') b.onset = 'n';
    // liquidização: ㄴ+ㄹ e ㄹ+ㄴ → ㄹㄹ
    if (c === 'N' && b.onset === 'r') a.coda = ['L'];
    else if (c === 'L' && b.onset === 'n') b.onset = 'r';
    // nasalização: obstruinte antes de nasal
    if ((b.onset === 'n' || b.onset === 'm') && (c === 'K' || c === 'T' || c === 'P'))
      a.coda = [c === 'K' ? 'NG' : c === 'T' ? 'N' : 'M'];
    // tensificação depois de obstruinte
    if ((a.coda[0] === 'K' || a.coda[0] === 'T' || a.coda[0] === 'P') && TENSE[b.onset])
      b.onset = TENSE[b.onset];
  }
}

function render(syls: Syl[]): string {
  // ---- letras internas → IPA, com sonorização entre sons sonoros
  let out = '';
  let prevVoiced = false; // o som anterior é vogal ou soante (n, m, ŋ, l)
  syls.forEach((s, i) => {
    const front = /^(i|j|ɥ)/u.test(s.vowel);
    // ㅢ: ɰi só no início da palavra sem consoante (의사); depois, i (희망, 회의)
    const vowel = s.vowel === 'ɰi' && (i > 0 || s.onset !== '') ? 'i' : s.vowel;
    out += onsetIpa(s.onset, i === 0, prevVoiced, front) + vowel;
    prevVoiced = true;
    const c = s.coda[0];
    if (c) {
      out += { K: 'k', T: 't', P: 'p', N: 'n', M: 'm', NG: 'ŋ', L: 'l' }[c] ?? '';
      prevVoiced = c === 'N' || c === 'M' || c === 'NG' || c === 'L';
    }
    // ㄹㄹ: o ataque ㄹ depois de coda ㄹ é l (não ɾ)
    if (c === 'L' && syls[i + 1]?.onset === 'r') syls[i + 1].onset = 'LL';
  });
  return out;
}

function onsetIpa(o: string, initial: boolean, afterVoiced: boolean, front: boolean): string {
  const voice = !initial && afterVoiced;
  switch (o) {
    case '': return '';
    case 'g': return voice ? 'ɡ' : 'k';
    case 'd': return voice ? 'd' : 't';
    case 'b': return voice ? 'b' : 'p';
    case 'j': return voice ? 'd͡ʑ' : 't͡ɕ';
    case 'kk': return 'k͈';
    case 'tt': return 't͈';
    case 'pp': return 'p͈';
    case 'jj': return 't͡ɕ͈';
    case 'ss': return front ? 'ɕ͈' : 's͈';
    case 's': return front ? 'ɕʰ' : 'sʰ';
    case 'k': return 'kʰ';
    case 't': return 'tʰ';
    case 'p': return 'pʰ';
    case 'ch': return 't͡ɕʰ';
    case 'h': return 'h';
    case 'n': return 'n';
    case 'm': return 'm';
    case 'r': return 'ɾ';
    case 'LL': return 'l';
    case 'rh': return 'ɾh';
    default: return o;
  } // prettier-ignore
}
