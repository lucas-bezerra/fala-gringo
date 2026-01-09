import React from 'react';
import { WordResult } from '../types';

interface PhoneticCardProps {
  item: WordResult;
}

export const PhoneticCard: React.FC<PhoneticCardProps> = ({ item }) => {
  const isMissing = item.ipa.startsWith('[');

  return (
    <div className={`
      relative group flex flex-col items-center justify-between
      p-4 rounded-2xl transition-all duration-300
      ${isMissing 
        ? 'bg-red-950/20 border border-red-900/50' 
        : 'bg-white/5 border border-white/5 hover:border-brand-500/30 hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10'
      }
    `}>
      {/* English Word (Label) */}
      <span className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-2 group-hover:text-brand-400 transition-colors">
        {item.word}
      </span>

      {/* Main Translation (Hero) */}
      <span className={`text-xl md:text-2xl font-bold font-sans mb-1 text-center leading-tight
        ${isMissing ? 'text-red-400' : 'text-white bg-clip-text bg-gradient-to-br from-white to-slate-400 group-hover:from-accent-cyan group-hover:to-white transition-all'}
      `}>
        {isMissing ? '?' : item.ptbr}
      </span>

      {/* IPA (Subtle) */}
      <span className="text-xs font-mono text-slate-600 group-hover:text-slate-400 transition-colors bg-black/20 px-2 py-0.5 rounded-full mt-2">
        {item.ipa}
      </span>
    </div>
  );
};