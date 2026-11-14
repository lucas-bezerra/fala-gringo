/**
 * Italiano: grafia → IPA por regras (T5.2), no estilo do Wiktionary (a fonte do dicionário): geminadas escritas
 * (`tt`, `ɲɲ`, `ʎʎ`, `tt͡s`), `s` intervocálico sonoro, semivogais j/w.
 *
 * O que a grafia não diz e fica no padrão:
 * - tônica: só marcada quando há acento gráfico (`città`); sem ele, o motor usa a paroxítona (a mais comum);
 * - `e`/`o` abertos ou fechados: fechados (`ê`/`ô`), salvo `è`/`ò`;
 * - `z` surdo ou sonoro: surdo (`t͡s`).
 * Por isso a estimativa sai marcada como "estimado" na tela.
 */

const ITALIAN = /^[a-zàèéìíòóùú]+$/u;
const VOWELS = 'aeiouàèéìíòóùú';
const FRONT = 'eiéèìí';
const VOICED = 'bdglmnrv';
const ACCENT: Record<string, string> = {
  à: 'a',
  è: 'ɛ',
  é: 'e',
  ì: 'i',
  í: 'i',
  ò: 'ɔ',
  ó: 'o',
  ù: 'u',
  ú: 'u',
};

type Seg = { kind: 'C'; ipa: string } | { kind: 'V'; ch: string };

/** `undefined` se a palavra tiver símbolo fora do alfabeto italiano. */
export function italianToIpa(word: string): string | undefined {
  const w = word.normalize('NFC').toLocaleLowerCase('it');
  if (!ITALIAN.test(w)) return undefined;
  const at = (i: number) => w[i] ?? '';
  const isV = (c: string) => c !== '' && VOWELS.includes(c);
  const segs: Seg[] = [];
  const C = (ipa: string) => segs.push({ kind: 'C', ipa });
  /** "ci", "gi", "sci" antes de vogal: o i só indica o som da consoante (ciao, giorno, sciame). */
  const silentI = (i: number) => at(i) === 'i' && isV(at(i + 1));

  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const next = at(i + 1);
    const prevV = isV(at(i - 1));
    if (isV(c)) {
      segs.push({ kind: 'V', ch: c });
      continue;
    }
    switch (c) {
      case 'c': {
        if (next === 'q') {
          C('k'); // "acqua": kkw
          break;
        }
        const double = next === 'c';
        const j = double ? i + 1 : i;
        const after = at(j + 1);
        if (after === 'h') {
          C(double ? 'kk' : 'k');
          i = j + 1;
        } else if (FRONT.includes(after) && after !== '') {
          C(double ? 'tt͡ʃ' : 't͡ʃ');
          i = silentI(j + 1) ? j + 1 : j;
        } else {
          C(double ? 'kk' : 'k');
          i = j;
        }
        break;
      }
      case 'g': {
        const double = next === 'g';
        const j = double ? i + 1 : i;
        const after = at(j + 1);
        if (after === 'h') {
          C(double ? 'ɡɡ' : 'ɡ');
          i = j + 1;
        } else if (!double && after === 'n') {
          C(prevV ? 'ɲɲ' : 'ɲ');
          i = j + 1;
        } else if (!double && after === 'l' && at(j + 2) === 'i') {
          // "gli": ʎʎ antes de vogal (famiglia), ʎi no fim ou antes de consoante (gli, figli)
          const vowelAfter = isV(at(j + 3));
          C(prevV ? 'ʎʎ' : 'ʎ');
          if (vowelAfter) i = j + 2;
          else i = j + 1; // o i fica como vogal
        } else if (FRONT.includes(after) && after !== '') {
          C(double ? 'dd͡ʒ' : 'd͡ʒ');
          i = silentI(j + 1) ? j + 1 : j;
        } else {
          C(double ? 'ɡɡ' : 'ɡ');
          i = j;
        }
        break;
      }
      case 's':
        if (next === 'c' && FRONT.includes(at(i + 2)) && at(i + 2) !== '') {
          C(prevV ? 'ʃʃ' : 'ʃ');
          i = silentI(i + 2) ? i + 2 : i + 1;
        } else if (next === 's') {
          C('ss');
          i++;
        } else if ((prevV && isV(next)) || (next !== '' && VOICED.includes(next))) C('z');
        else C('s');
        break;
      case 'z': {
        // sufixo -izzare/-izzazione (e derivados): z sonoro (organizzare, realizzazione)
        const voiced =
          w.slice(i - 1, i + 3) === 'izza' ||
          w.slice(i - 1, i + 3) === 'izzo' ||
          w.slice(i - 1, i + 3) === 'izze';
        if (next === 'z') i++;
        const t = voiced ? 'd' : 't';
        C(prevV && isV(at(i + 1)) ? `${t}${t}͡${voiced ? 'z' : 's'}` : `${t}͡${voiced ? 'z' : 's'}`);
        break;
      }
      case 'q':
        C('k');
        if (next === 'u') {
          segs.push({ kind: 'C', ipa: 'w' });
          i++;
        }
        break;
      case 'h':
        break;
      case 'x':
        C('ks');
        break;
      case 'y':
        segs.push({ kind: 'V', ch: 'i' });
        break;
      case 'j':
        C('j');
        break;
      default:
        C(c); // b d f k l m n p r t v w (a geminada sai escrita duas vezes, como na fonte)
    }
  }

  // Vogais: i/u átonos ao lado de outra vogal viram semivogal (j/w), exceto se forem o único núcleo da sequência.
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
    const weak = (ch: string) => ch === 'i' || ch === 'u';
    let nucleus = run.findIndex((ch) => !weak(ch));
    if (nucleus < 0) nucleus = run.length - 1;
    run.forEach((ch, k) => {
      if (k !== nucleus && weak(ch) && run.length > 1) out += ch === 'i' ? 'j' : 'w';
      else if (ACCENT[ch]) out += `ˈ${ACCENT[ch]}`;
      else out += ch;
    });
    i = j;
  }
  // Sufixos gregos com "í" tônico em hiato: fotografia, biologia, filosofia, terapia (o resto: paroxítona)
  if (GREEK_IA.test(w) && out.endsWith('ja')) out = `${out.slice(0, -2)}ˈia`;
  return out || undefined;
}

const GREEK_IA =
  /(grafia|logia|sofia|patia|fobia|filia|mania|crazia|cracia|terapia|metria|scopia|tomia|fonia|gamia|nomia|algia|emia|archia|lalia)$/u;
