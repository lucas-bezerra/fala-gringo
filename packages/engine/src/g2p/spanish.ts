/**
 * Espanhol: grafia → IPA por regras (T5.1). A ortografia do espanhol é quase fonêmica, então regras bastam.
 *
 * Saída no mesmo estilo do WikiPron (a fonte do dicionário): transcrição ampla, sem marca de tônica nem pontos
 * (a tônica vem da regra ortográfica do motor, `spanishStressFromEnd`), b d ɡ em vez de β ð ɣ, ditongo crescente
 * com j/w (`bweno`) e decrescente com i/u (`soi`).
 *
 * Usos: estimar palavras fora do dicionário (o WikiPron não tem `de`, `a`, nem formas verbais como `quieres`) e
 * escolher, entre as variantes do dicionário, a mais próxima do padrão (o WikiPron põe `a` antes de `la`).
 */

const SPANISH = /^[a-zñáéíóúü]+$/u;
const STRONG = new Set([...'aeoáéó']);
const ACCENTED_WEAK = new Set([...'íú']);
const FRONT = new Set([...'eiéí']);

type Seg = { kind: 'C'; ipa: string } | { kind: 'V'; ch: string };

/** `undefined` se a palavra tiver símbolo fora do alfabeto espanhol. */
export function spanishToIpa(word: string, lang: 'es-ES' | 'es-419'): string | undefined {
  const w = word.normalize('NFC').toLocaleLowerCase('es');
  if (!SPANISH.test(w)) return undefined;
  const ceceo = lang === 'es-ES' ? 'θ' : 's';
  const segs: Seg[] = [];
  const at = (i: number) => w[i] ?? '';
  const isVowelCh = (c: string) => 'aeiouáéíóúü'.includes(c) && c !== '';

  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const next = at(i + 1);
    const prev = at(i - 1);
    const C = (ipa: string) => segs.push({ kind: 'C', ipa });
    switch (c) {
      case 'a':
      case 'e':
      case 'i':
      case 'o':
      case 'u':
      case 'á':
      case 'é':
      case 'í':
      case 'ó':
      case 'ú':
      case 'ü':
        segs.push({ kind: 'V', ch: c });
        break; // prettier-ignore
      case 'b':
      case 'v':
        C('b');
        break;
      case 'c':
        if (next === 'h') {
          C('t͡ʃ');
          i++;
        } else if (FRONT.has(next)) C(ceceo);
        else C('k');
        break;
      case 'g':
        if (next === 'u' && FRONT.has(at(i + 2))) {
          C('ɡ');
          i++; // "gue", "gui": u mudo
        } else if (FRONT.has(next)) C('x');
        else C('ɡ');
        break;
      case 'q':
        C('k');
        if (next === 'u' && FRONT.has(at(i + 2))) i++; // "que", "qui": u mudo ("qua" de empréstimos fica)
        break;
      case 'h':
        C(''); // mudo ("ch" já foi tratado no c), mas separa vogais: "prohíbe", "antihéroe"
        break;
      case 'j':
        C('x');
        break;
      case 'l':
        if (next === 'l') {
          C('ʝ');
          i++;
        } else C('l');
        break;
      case 'ñ':
        C('ɲ');
        break;
      case 'n':
        C('bvpm'.includes(next) && next !== '' ? 'm' : 'n');
        break;
      case 'r':
        if (next === 'r') {
          C('r');
          i++;
        } else C(i === 0 || 'lns'.includes(prev) ? 'r' : 'ɾ');
        break;
      case 'x':
        C(i === 0 ? 's' : 'ɡs'); // o "x" basco/nauatle ("amatxu", "México") não é previsível pela grafia
        break;
      case 'z':
        C(ceceo);
        break;
      case 'y':
        // consoante antes de vogal ("yo", "mayo"); vogal no fim ou antes de consoante ("hoy", "y")
        if (isVowelCh(next)) C('ʝ');
        else segs.push({ kind: 'V', ch: 'i' });
        break;
      case 'w':
        C('w');
        break;
      case 'k':
        C('k');
        break;
      default:
        C(c); // d f m p s t
    }
  }

  // Convenções do WikiPron: oclusiva surda no fim da sílaba (antes de consoante) sonoriza ("actuar" → aɡtwaɾ,
  // "cápsula" → kabsula); consoante dobrada se simplifica ("colonna" → kolona).
  const VOICE: Record<string, string> = { k: 'ɡ', p: 'b' };
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const n = segs[i + 1];
    if (s.kind !== 'C' || !n) continue;
    if (n.kind === 'C' && n.ipa === s.ipa && s.ipa !== '' && !'nm'.includes(s.ipa))
      s.ipa = ''; // "nn"/"mm" ficam (innato, conmigo)
    else if (n.kind === 'C' && !['', 'l', 'ɾ', 'r'].includes(n.ipa) && VOICE[s.ipa]) s.ipa = VOICE[s.ipa]; // pl, pr…: ataque
  }

  // Vogais: em cada sequência, as fortes e as fracas acentuadas são núcleo. Fraca átona ANTES do núcleo vira
  // semivogal (j/w); DEPOIS, fica i/u (ditongo decrescente). Sem núcleo ("ui", "iu"), o último é o núcleo.
  let out = '';
  for (let i = 0; i < segs.length;) {
    const s = segs[i];
    if (s.kind === 'C') {
      out += s.ipa;
      i++;
      continue;
    }
    let j = i;
    while (j < segs.length && segs[j].kind === 'V') j++;
    const run = segs.slice(i, j).map((v) => (v as { ch: string }).ch);
    let nucleus = run.findIndex((ch) => STRONG.has(ch) || ACCENTED_WEAK.has(ch));
    if (nucleus < 0) nucleus = run.length - 1;
    run.forEach((ch, k) => {
      const base = ch.normalize('NFD').replace(/\p{M}/gu, '');
      const glide = k < nucleus && !STRONG.has(ch) && !ACCENTED_WEAK.has(ch) && run[k + 1] !== ch; // "ii": hiato
      // hiato com vogal fraca acentuada ("país", "día"): o ponto impede o ditongo e casa com a regra da tônica
      const prev = run[k - 1];
      if (k > 0 && (ACCENTED_WEAK.has(ch) || (prev !== undefined && ACCENTED_WEAK.has(prev)))) out += '.';
      if (glide) out += base === 'i' ? 'j' : 'w';
      else out += base;
    });
    i = j;
  }
  return out || undefined;
}
