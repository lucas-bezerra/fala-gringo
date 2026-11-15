/**
 * Francês: grafia → IPA por regras (T5.4), aproximado. Serve para ESCOLHER a variante principal do dicionário:
 * o WikiPron lista primeiro formas reduzidas, coloquiais ou de liaison (`de` → dam, `je` → ʃ, `bon` → bɔn‿,
 * `être` → dɛt), e a forma de citação está entre as outras. Para estimar palavras fora do dicionário, o modelo
 * G2P do francês é bem melhor que estas regras (a ortografia francesa tem muitas exceções).
 *
 * Saída no estilo do WikiPron: ʁ, nasais ɑ̃ ɛ̃ ɔ̃ œ̃, e mudo final omitido, ə nos monossílabos (le, de, je).
 */

const FRENCH = /^[a-zàâäçéèêëîïôöùûüÿœæ'-]+$/u;
const VOWEL_LETTERS = 'aeiouyàâäéèêëîïôöùûüÿœæ';
/** Palavras curtíssimas e exceções que as regras gerais errariam (formas de citação). */
const FIXED: Record<string, string> = {
  le: 'lə', de: 'də', je: 'ʒə', ce: 'sə', me: 'mə', te: 'tə', se: 'sə', ne: 'nə', que: 'kə',
  les: 'le', des: 'de', mes: 'me', tes: 'te', ses: 'se', ces: 'se',
  et: 'e', est: 'ɛ', monsieur: 'məsjø', messieurs: 'mesjø', femme: 'fam', femmes: 'fam', second: 'səɡɔ̃',
}; // prettier-ignore
/** Consoantes finais que costumam soar (regra "CaReFuL"); as demais são mudas no fim da palavra. */
const FINAL_SOUNDING = new Set(['c', 'r', 'f', 'l', 'q', 'k']);

export function frenchToIpa(word: string): string | undefined {
  let w = word.normalize('NFC').toLocaleLowerCase('fr');
  if (!FRENCH.test(w)) return undefined;
  w = w.replace(/['-]/gu, '');
  if (!w) return undefined;
  return FIXED[w] ?? (core(w) || undefined);
}

const isV = (c: string | undefined) => c !== undefined && c !== '' && VOWEL_LETTERS.includes(c);

function core(w: string): string {
  // e mudo final ("autre", "rue"): sai antes do resto, mas só se sobrar vogal
  let s = w;
  let muteE = false; // tirou um e mudo do fim: "une", "bonne" → a nasal antes dele não vale
  const hasOtherVowel = (t: string) => [...t].some((c) => isV(c));
  if (/e$/u.test(s) && hasOtherVowel(s.slice(0, -1))) [s, muteE] = [s.slice(0, -1), true];
  else if (/es$/u.test(s) && hasOtherVowel(s.slice(0, -2))) [s, muteE] = [s.slice(0, -2), true];
  else if (/(aient|oient)$/u.test(s)) s = s.slice(0, -3); // imperfeito: "avaient" → avɛ
  // terminações verbais e mudas muito regulares
  s = s.replace(/(er|ez)$/u, (m, _g, off: number) => (off > 1 && !ER_SOUNDING.has(w) ? 'é' : m));
  s = s.replace(/et$/u, (m, off: number) => (off > 0 ? 'è' : m));

  let out = '';
  for (let i = 0; i < s.length;) {
    const rest = s.slice(i);
    const prev = s[i - 1];
    const at = (k: number) => s[i + k] ?? '';
    const end = (k: number) => i + k >= s.length;
    const nasalOk = (k: number) => !isV(at(k)) && at(k) !== 'n' && at(k) !== 'm' && !(muteE && end(k)); // "bonne", "une"
    const emit = (ipa: string, len: number) => {
      out += ipa;
      i += len;
    };

    // ---- vogais compostas e nasais (das maiores para as menores)
    if (rest.startsWith('eau')) { emit('o', 3); continue; } // prettier-ignore
    if (rest.startsWith('oin') && nasalOk(3)) { emit('wɛ̃', 3); continue; } // prettier-ignore
    if (rest.startsWith('ien') && nasalOk(3)) { emit('jɛ̃', 3); continue; } // prettier-ignore
    if (/^(ain|aim|ein|eim)/u.test(rest) && nasalOk(3)) { emit('ɛ̃', 3); continue; } // prettier-ignore
    if (rest.startsWith('oi')) { emit('wa', 2); continue; } // prettier-ignore
    if (rest.startsWith('oy') && isV(at(2))) { emit('waj', 2); continue; } // prettier-ignore
    if (rest.startsWith('ou') || rest.startsWith('où') || rest.startsWith('oû')) {
      emit(isV(at(2)) ? 'w' : 'u', 2);
      continue;
    }
    if (rest.startsWith('au')) { emit('o', 2); continue; } // prettier-ignore
    if (/^(ai|ei|aî)/u.test(rest)) { emit('ɛ', 2); continue; } // prettier-ignore
    if (/^(eu|œu)/u.test(rest)) {
      const len = rest.startsWith('œu') ? 2 : 2;
      emit(end(len) || at(len) === 's' || at(len) === 'x' ? 'ø' : 'œ', len);
      continue;
    }
    if (/^(an|am|en|em)/u.test(rest) && nasalOk(2)) { emit('ɑ̃', 2); continue; } // prettier-ignore
    if (/^(in|im|yn|ym)/u.test(rest) && nasalOk(2)) { emit('ɛ̃', 2); continue; } // prettier-ignore
    if (/^(on|om)/u.test(rest) && nasalOk(2)) { emit('ɔ̃', 2); continue; } // prettier-ignore
    if (/^(un|um)/u.test(rest) && nasalOk(2)) { emit('œ̃', 2); continue; } // prettier-ignore
    if (rest.startsWith('ill') && isV(prev)) { emit('j', 3); continue; } // prettier-ignore
    if (rest.startsWith('ille') || (rest.startsWith('ill') && end(3))) {
      emit(/^(ville|mille|tranquill)/u.test(s.slice(Math.max(0, i - 1))) ? 'il' : 'ij', 3);
      continue;
    }

    const c = s[i];
    // ---- vogais simples
    if (isV(c)) {
      const next = at(1);
      switch (c) {
        case 'a':
        case 'à':
        case 'â':
        case 'ä': emit('a', 1); break; // prettier-ignore
        case 'é': emit('e', 1); break; // prettier-ignore
        case 'è':
        case 'ê':
        case 'ë': emit('ɛ', 1); break; // prettier-ignore
        case 'i':
        case 'î':
        case 'ï':
        case 'y':
        case 'ÿ':
          emit(isV(next) && !end(1) ? 'j' : 'i', 1);
          break; // prettier-ignore
        case 'o':
        case 'ô':
        case 'ö': emit(end(1) || c === 'ô' ? 'o' : 'ɔ', 1); break; // prettier-ignore
        case 'u':
        case 'û':
        case 'ü':
          emit(next === 'i' ? 'ɥ' : 'y', 1);
          break; // prettier-ignore
        case 'ù': emit('u', 1); break; // prettier-ignore
        case 'œ':
        case 'æ': emit('e', 1); break; // prettier-ignore
        case 'e': {
          // e antes de duas consoantes ou de consoante final pronunciada: ɛ ("elle", "avec", "merci")
          const closed =
            (!isV(next) && !isV(at(2)) && next !== '' && at(2) !== '') ||
            (!isV(next) && end(2) && next !== '');
          emit(closed ? 'ɛ' : 'ə', 1);
          break;
        }
        default: emit(c, 1); // prettier-ignore
      }
      continue;
    }

    // ---- consoantes
    const next = at(1);
    const lastCons = end(1) || (end(2) && next === 's'); // consoante final (com ou sem -s de plural)
    if (lastCons && !FINAL_SOUNDING.has(c) && !(muteE && end(1))) {
      i += end(1) ? 1 : 2;
      continue; // muda: "petit", "trop", "nous", "prix"
    }
    if (next === c && c !== 'c') {
      i++;
      continue;
    } // dobrada: "elle" → ɛl // prettier-ignore
    switch (c) {
      case 'c':
        if (next === 'h') emit('ʃ', 2);
        else if (next === 'c' && 'eiy'.includes(at(2)) && at(2) !== '') emit('ks', 2);
        else if ('eiyéèê'.includes(next) && next !== '') emit('s', 1);
        else emit('k', next === 'c' ? 2 : 1);
        break;
      case 'ç': emit('s', 1); break; // prettier-ignore
      case 'g':
        if (next === 'n') emit('ɲ', 2);
        else if (next === 'u' && 'eiy'.includes(at(2)) && at(2) !== '') emit('ɡ', 2);
        else if ('eiyéèê'.includes(next) && next !== '')
          emit('ʒ', next === 'e' && 'aou'.includes(at(2)) && at(2) !== '' ? 2 : 1);
        else emit('ɡ', 1);
        break;
      case 'p': emit(next === 'h' ? 'f' : 'p', next === 'h' ? 2 : 1); break; // prettier-ignore
      case 't':
        if (next === 'h') emit('t', 2);
        else if (s.slice(i, i + 4) === 'tion' && prev !== 's') emit('s', 1);
        else emit('t', 1);
        break;
      case 'q': emit('k', next === 'u' ? 2 : 1); break; // prettier-ignore
      case 's':
        if (next === 'c' && 'eiy'.includes(at(2)) && at(2) !== '') emit('s', 2);
        else emit(isV(prev) && isV(next) ? 'z' : 's', 1);
        break;
      case 'x':
        emit(prev === 'e' && i === 1 && isV(next) ? 'ɡz' : 'ks', 1);
        break;
      case 'h': i++; break; // prettier-ignore
      case 'j': emit('ʒ', 1); break; // prettier-ignore
      case 'r': emit('ʁ', 1); break; // prettier-ignore
      default:
        emit(c, 1); // b d f k l m n v w z
    }
  }
  return out;
}

/** -er/-ez finais que soam (não são infinitivo/2ª pessoa): mer, fer, hiver, hier, cher, fier, amer, cancer. */
const ER_SOUNDING = new Set([
  'mer',
  'fer',
  'hiver',
  'hier',
  'cher',
  'fier',
  'amer',
  'cancer',
  'enfer',
  'super',
]);
