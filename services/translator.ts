import { lookupWord } from './dictionaryService';
import { convertIpaToPtBr } from './ipaMappings';
import { PhoneticResult, WordResult } from '../types';

export const translateText = (text: string, dictionary: Map<string, string>): PhoneticResult => {
  // 1. Tokenize text (preserve sentence structure roughly, but process words)
  // We match words including apostrophes, treating everything else as whitespace/punctuation separators
  const tokens =
  text.match(
    /[\p{Script=Latin}0-9']+|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[\p{Script=Hangul}]+/gu
  ) || [];
  
  const wordLevel: WordResult[] = [];
  const ipaList: string[] = [];
  const ptbrList: string[] = [];

  for (const token of tokens) {
    const originalWord = token;
    
    // Dictionary Lookup
    let ipa = lookupWord(originalWord, dictionary);
    
    // Fallback if not found: keep the word as is, mark IPA as "?"
    if (!ipa) {
      ipa = `[${originalWord}]`; // Indicate missing
    }

    // Clean up IPA: remove slashes if they exist in source (the source usually doesn't have slashes, but just in case)
    const cleanIpa = ipa.replace(/\//g, '');
    
    // Convert to PT-BR
    // If the word was missing (indicated by brackets), we don't convert
    const ptbr = cleanIpa.startsWith('[') ? originalWord : convertIpaToPtBr(cleanIpa);

    wordLevel.push({
      word: originalWord,
      ipa: cleanIpa,
      ptbr: ptbr
    });

    ipaList.push(cleanIpa);
    ptbrList.push(ptbr);
  }

  return {
    english: text,
    ipa: ipaList.join(' '),
    ptbr: ptbrList.join(' '),
    wordLevel,
    metadata: {
      type: tokens.length > 1 ? 'phrase' : 'word',
      wordCount: tokens.length,
      processedAt: new Date().toISOString()
    }
  };
};