export interface WordResult {
  word: string;
  ipa: string;
  ptbr: string;
}

export interface PhoneticResult {
  english: string; // Creates backwards compatibility, but represents input text
  ipa: string;
  ptbr: string;
  wordLevel: WordResult[];
  metadata: {
    type: 'phrase' | 'word';
    wordCount: number;
    processedAt: string;
  };
}

export interface DictionaryState {
  data: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  count: number;
  currentLanguage: string;
}

export interface LanguageConfig {
  code: string; // e.g., 'en_US', 'fr_FR'
  name: string;
  flag: string;
  dictFile?: string; // The specific filename in the repo (e.g., 'de' for 'de_DE')
}