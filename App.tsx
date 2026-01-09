import React, { useEffect, useState, useMemo } from 'react';
import { DictionaryState, PhoneticResult } from './types';
import { fetchDictionary, AVAILABLE_LANGUAGES } from './services/dictionaryService';
import { translateText } from './services/translator';
import { PhoneticCard } from './components/PhoneticCard';
import { TipsPanel } from './components/TipsPanel';

const App: React.FC = () => {
  const [dictionary, setDictionary] = useState<DictionaryState>({
    data: new Map(),
    isLoading: true,
    error: null,
    count: 0,
    currentLanguage: 'en_US'
  });

  const [inputText, setInputText] = useState<string>('');
  const [debouncedText, setDebouncedText] = useState<string>('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  // Load Dictionary logic
  const loadDictionaryForLanguage = async (langCode: string) => {
    setDictionary(prev => ({ ...prev, isLoading: true, error: null, currentLanguage: langCode }));
    try {
      const map = await fetchDictionary(langCode);
      setDictionary({ 
        data: map, 
        isLoading: false, 
        error: null, 
        count: map.size,
        currentLanguage: langCode
      });
    } catch (err) {
      setDictionary(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: `Erro ao baixar dicionário ${langCode}.`,
        data: new Map() // clear data on error
      }));
    }
  };

  useEffect(() => {
    loadDictionaryForLanguage('en_US');
  }, []);
  
  // Debounce input
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedText(inputText); }, 500);
    return () => clearTimeout(handler);
  }, [inputText]);

  // Compute Result
  const result: PhoneticResult | null = useMemo(() => {
    if (!debouncedText.trim() || dictionary.data.size === 0) return null;
    return translateText(debouncedText, dictionary.data);
  }, [debouncedText, dictionary.data]);

  const handleLanguageChange = (langCode: string) => {
    if (langCode === dictionary.currentLanguage) return;
    setInputText(''); // Clear text on language switch to avoid confusing lookups
    setShowLangMenu(false);
    loadDictionaryForLanguage(langCode);
  };

  const currentLangConfig = AVAILABLE_LANGUAGES.find(l => l.code === dictionary.currentLanguage) || AVAILABLE_LANGUAGES[0];

  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 md:p-8 overflow-hidden font-sans">
      
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-600/20 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-violet/10 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-[40%] left-[40%] w-full h-full bg-transparent opacity-30 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      <div className="z-10 w-full max-w-6xl space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-white/5 pb-6">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 text-glow">
              Fala<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-cyan">Gringo</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
              CONVERSOR FONÉTICO <span className="text-slate-600 mx-2">|</span> IPA → PT-BR
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-wrap items-center justify-center gap-3">
            
            {/* Language Selector */}
            <div className="relative">
              <button 
                onClick={() => !dictionary.isLoading && setShowLangMenu(!showLangMenu)}
                disabled={dictionary.isLoading}
                className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold font-mono text-white flex items-center gap-2 hover:bg-white/10 transition-colors"
              >
                <span>{currentLangConfig.flag}</span>
                <span>{currentLangConfig.name}</span>
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {/* Dropdown */}
              {showLangMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in backdrop-blur-xl">
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full text-left px-4 py-3 text-xs font-bold font-mono flex items-center gap-3 hover:bg-white/5 transition-colors
                        ${dictionary.currentLanguage === lang.code ? 'text-brand-400 bg-white/5' : 'text-slate-400'}
                      `}
                    >
                      <span className="text-base">{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono border flex items-center gap-2 backdrop-blur-md
              ${dictionary.isLoading 
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' 
                : dictionary.error 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
              <span className={`w-2 h-2 rounded-full ${dictionary.isLoading ? 'bg-yellow-500 animate-pulse' : dictionary.error ? 'bg-red-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></span>
              {dictionary.isLoading ? 'LOADING DB...' : dictionary.error ? 'ERROR' : 'READY'}
            </div>
          </div>
        </header>

        {/* Main Interface */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Input */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            <div className="glass-panel rounded-2xl p-1 shadow-2xl">
              <div className="bg-space-950/50 rounded-xl p-4 md:p-6">
                <label className="block text-xs font-bold text-brand-400 uppercase tracking-widest mb-3 pl-1">
                  Input ({currentLangConfig.name})
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Digite algo em ${currentLangConfig.name}...`}
                  disabled={dictionary.isLoading}
                  className="w-full h-40 bg-transparent border-none text-white text-xl md:text-2xl placeholder-slate-700 focus:ring-0 resize-none leading-relaxed font-light"
                  spellCheck="false"
                />
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                  <span className="text-xs text-slate-500 font-mono">{inputText.length} chars</span>
                  <button 
                    onClick={() => setInputText('')} 
                    className="text-xs text-slate-500 hover:text-white transition-colors uppercase font-bold tracking-wider"
                    disabled={!inputText}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {result ? (
              <div className="space-y-6 animate-fade-in">
                
                {/* Primary Result Box */}
                <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phonetic Translation</h2>
                  </div>

                  {/* Word Chips */}
                  <div className="flex flex-wrap gap-3 mb-8">
                    {result.wordLevel.map((item, idx) => (
                      <PhoneticCard key={`${item.word}-${idx}`} item={item} />
                    ))}
                  </div>

                  {/* Sentence Reader */}
                  <div className="space-y-4 pt-6 border-t border-white/10">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Leitura Corrida (PT-BR)</p>
                      <p className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
                        {result.ptbr}
                      </p>
                    </div>
                  </div>
                </div>                
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-white/5 text-slate-600">
                <div className="p-4 bg-slate-900 rounded-full mb-4 shadow-xl">
                  {dictionary.isLoading ? (
                    <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                </div>
                <p className="text-lg font-medium text-slate-500">
                  {dictionary.isLoading ? `Downloading ${currentLangConfig.name} dictionary...` : 'Waiting for input...'}
                </p>
                {!dictionary.isLoading && (
                   <p className="text-sm text-slate-600 mt-2">Type something in {currentLangConfig.name} to begin.</p>
                )}
              </div>
            )}
          </section>

          {/* Right Column: Results */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            <TipsPanel langCode={dictionary.currentLanguage} />
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;