import { LanguageConfig } from "../types";
import { getDictionaryFromDB, saveDictionaryToDB } from './dictionaryDB';

// Base URL for the open-dict-data repository
const BASE_REPO_URL = `/api/dictionary`;

export const AVAILABLE_LANGUAGES: LanguageConfig[] = [
  { code: 'en_US', name: 'English (US)', flag: '🇺🇸', dictFile: 'en_US' },
  // { code: 'es_ES', name: 'Spanish (Spain)', flag: '🇪🇸', dictFile: 'es_ES' },
  // { code: 'fr_FR', name: 'French (France)', flag: '🇫🇷', dictFile: 'fr_FR' },
  // { code: 'de', name: 'German', flag: '🇩🇪', dictFile: 'de' },
  // { code: 'ja', name: 'Japanese', flag: '🇯🇵', dictFile: 'ja' },
  // { code: 'ko', name: 'Korean', flag: '🇰🇷', dictFile: 'ko' },
  // { code: 'sv', name: 'Swedish', flag: '🇸🇪', dictFile: 'sv' },
  // { code: 'ro', name: 'Romanian', flag: '🇷🇴', dictFile: 'ro' },
  // { code: 'nl', name: 'Dutch', flag: '🇳🇱', dictFile: 'nl' },
];

const VERSION = 'v1';

/**
 * Fetches the raw text file and parses it into a Map.
 * Tries to load from LocalStorage first for offline support.
 */
export const fetchDictionary = async (langCode: string = 'en_US'): Promise<Map<string, string>> => {
  let text = '';
  let source = 'fetch';
  const storageKey = `dict_${VERSION}_${langCode}`
  
  // Resolve the correct filename from config
  const config = AVAILABLE_LANGUAGES.find(l => l.code === langCode);
  // If no config found (rare), default to using the code itself, but safe fallback to en_US
  const filename = config?.dictFile || langCode; 
  
  const dictionaryUrl = `${BASE_REPO_URL}/${filename}.txt`;

  // 1. Try Local Storage
  try {
    const cached = await getDictionaryFromDB(storageKey);
    if (cached) {
      text = cached;
      source = 'indexeddb';
    }
  } catch (e) {
    console.warn("LocalStorage access failed", e);
  }

  // 2. Fetch from Network if no cache
  if (!text) {
    try {
      console.log(`Fetching dictionary for ${langCode} from ${dictionaryUrl}...`);
      const response = await fetch(dictionaryUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dictionary (${response.status}) from ${dictionaryUrl}`);
      }
      
      text = await response.text();
      
      // Save to cache
      try {
        saveDictionaryToDB(storageKey, text).catch(err =>
          console.warn('IndexedDB save failed', err)
        );
      } catch (e) {
        // Quota exceeded is common with multiple dictionaries
        console.warn("Failed to save dictionary to cache (quota exceeded?)", e);
      }
    } catch (error) {
      console.error("Dictionary Load Error:", error);
      throw error;
    }
  }

  const map = new Map<string, string>();
  const data = JSON.parse(text)

  const lines = data.text.split('\n');
  
  for (const line of lines) {
    // open-dict-data is strictly tab-separated: word \t ipa
    const parts = line.trim().split('\t');
    
    if (parts.length >= 2) {
      const word = parts[0];
      let ipa = parts[1]; 

      // Sometimes IPA field contains comma-separated variants e.g. "bɪn, biːn"
      if (ipa.includes(',')) {
        ipa = ipa.split(',')[0].trim();
      }

      // Cleanup: Remove surrounding slashes
      ipa = ipa.replace(/^\/|\/$/g, '');

      if (word && ipa) {
        // We lower case strictly for lookup
        const cleanWord = word.toLowerCase(); 
        
        // Only set if not exists to prioritize the first occurrence
        if (cleanWord && !map.has(cleanWord)) {
          map.set(cleanWord, ipa);
        }
      }
    }
  }
  
  console.log(`Dictionary (${langCode}) loaded from ${source}. Size: ${map.size}`);
  return map;
};

/**
 * Looks up a word in the dictionary map.
 */
export const lookupWord = (word: string, map: Map<string, string>): string | null => {
  const cleanWord = word.toLowerCase();
  
  // Try exact match first
  if (map.has(cleanWord)) {
    return map.get(cleanWord) || null;
  }
  
  // Try stripping some common punctuation if exact fail (like trailing dots)
  const stripped = cleanWord.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
  if (map.has(stripped)) {
    return map.get(stripped) || null;
  }

  return null;
};