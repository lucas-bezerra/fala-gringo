/**
 * A comprehensive map of IPA symbols to Brazilian Portuguese phonetic approximations.
 * Covers English, European languages, and Asian languages (Japanese, Korean).
 */
export const IPA_TO_PTBR_MAP: Record<string, string> = {
  // --- VOWELS ---
  
  // High
  "i": "i",
  "ɪ": "i",   // bit
  "y": "ü",   // French 'tu', German 'über'
  "ʏ": "ü",   // German 'schützen'
  "u": "u",
  "ʊ": "u",   // put
  "ɯ": "u",   // Japanese 'u' (unrounded), Korean 'eu' -> BR 'u'
  "ɨ": "u",   // Russian/European variations -> BR 'u'

  // Mid
  "e": "ê",
  "ø": "ê",   // French 'feu'
  "œ": "é",   // French 'cœur'
  "ɛ": "é",   // bet
  "ə": "â",   // schwa
  "o": "ou",  
  "ɔ": "ó",   // law
  "ʌ": "â",   // English 'cut', Korean 'eo' (approximation, sometimes 'ó' fits well too, but 'â' is safer)
  "ɝ": "âr",  // bird
  "ɜ": "â",   // nurse
  "ɚ": "er",  // letter
  "ɤ": "ô",   // Mandarin/Thai 'e' -> closed 'o' or 'e' depending on context, 'ô' is safe

  // Low
  "æ": "é",   // cat
  "a": "a",   
  "ɑ": "á",   // hot
  "ɒ": "ó",   // lot
  
  // Nasal Vowels
  "ɑ̃": "ã",   
  "ɛ̃": "ã",   
  "ɔ̃": "õ",   
  "œ̃": "un",  

  // Diphthongs & Glides
  "aɪ": "ai", 
  "aʊ": "au", 
  "ɔɪ": "ói", 
  "oʊ": "ou", 
  "eɪ": "êi", 
  "ɛə": "é",  
  "ɪə": "ia", 
  "ʊə": "ua", 
  "au": "au", 
  "ei": "ei", 
  "eu": "ói", 
  "ai": "ai",
  "oi": "oi",
  
  // Korean/Japanese Combinations (simplified)
  "ja": "ia",
  "je": "iê",
  "jo": "iô",
  "ju": "iu",
  "wa": "ua",
  "we": "ué",
  "wi": "ui",
  "wo": "uô",

  // --- CONSONANTS ---

  // Plosives
  "p": "p",
  "b": "b",
  "t": "t",
  "d": "d",
  "k": "k",
  "g": "g",
  "ʔ": "",    // Glottal stop
  "ɡ": "g",   // IPA variant for g

  // Fricatives
  "f": "f",
  "ɸ": "f",   // Japanese 'fu' (bilabial) -> f
  "v": "v",
  "β": "v",   // Spanish 'b' (intervocalic) -> v
  "θ": "f",   // think -> fink
  "ð": "d",   // this -> dis
  "s": "s",
  "z": "z",
  "ʃ": "ch",  // she
  "ɕ": "x",   // Japanese 'shi' (alveolo-palatal) -> x/ch
  "ʒ": "j",   // measure
  "ʑ": "j",   // Japanese 'ji' -> j
  "h": "r",   // hat -> rét (Initial H in EN/JA/KO sounds like BR R)
  "x": "rr",  // German/Spanish 'ch'/'j'
  "χ": "rr",  
  "ɣ": "g",   
  "ç": "ss",  // German 'ich', Japanese 'hi' variant -> ss
  "ʁ": "rr",  // French R

  // Affricates
  "tʃ": "tch",// chair
  "dʒ": "dj", // job
  "ts": "ts", // Japanese 'tsu', German 'z'
  "dz": "dz", 
  "tɕ": "tch",// Korean/Japanese 'ch'
  "dʑ": "dj", // Korean/Japanese 'j'

  // Nasals
  "m": "m",
  "n": "n",
  "ŋ": "ng",  // sing
  "ɲ": "nh",  // Spanish ñ, French gn, Japanese ny

  // Liquids
  "l": "l",
  "ɭ": "l",   // Retroflex l (Korean final L often)
  "ʎ": "lh",  // Italian gl
  "r": "r",   // Spanish trill
  "ɹ": "r",   // English r
  "ɾ": "r",   // Japanese/Korean flap R -> single r

  // Modifiers & Special
  "ʰ": "",    // Aspiration (Korean pʰ) -> ignore, mapping pʰ to p is closer for BR
  "ʲ": "i",   // Palatalization -> add 'i'
  "ː": "",    // Length -> ignore for simplified reading
  "ˈ": "'",   // Stress
  "ˌ": "",    
  ".": "-",   
  " ": " ",   
};

export const convertIpaToPtBr = (ipa: string): string => {
  if (!ipa) return "";
  
  let result = "";
  let i = 0;

  while (i < ipa.length) {
    // 1. Check for 2-character sequences (Diphthongs, Affricates)
    if (i + 1 < ipa.length) {
      const twoChar = ipa.substring(i, i + 2);
      if (IPA_TO_PTBR_MAP[twoChar] !== undefined) {
        result += IPA_TO_PTBR_MAP[twoChar];
        i += 2;
        continue;
      }
    }

    // 2. Check for Single Character
    const char = ipa[i];
    
    // Handle Modifiers specifically if not in map as a key
    if (char === 'ʰ') {
      // Skip aspiration
      i++;
      continue;
    }

    if (IPA_TO_PTBR_MAP[char] !== undefined) {
      result += IPA_TO_PTBR_MAP[char];
    } else {
      // Keep unknown characters (like punctuation) if they aren't IPA diacritics
      // Filter out some strict IPA diacritics that clutter output
      if (!/[˥˦˧˨˩̚]/.test(char)) {
         result += char;
      }
    }
    i++;
  }

  // Post-processing cleanup for better readability
  // Example: "tch" followed by "i" from palatalization might look weird if not handled, 
  // but "tchi" is valid.
  
  // Clean double spaces or weird hyphens
  result = result.replace(/-+/g, '-').replace(/ -/g, ' ').replace(/- /g, ' ');
  
  // Fix specific BR phonetic quirks
  // "ts" at start of word -> "ts" (Tsunami -> Tsunami)
  // "ng" at end -> "ng" (Samsung -> Samsung)

  return result;
};