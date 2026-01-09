import React from 'react';

interface Tip {
  symbol: string;
  title: string;
  description: string;
  example: string;
  color: string;
}

const ENGLISH_TIPS: Tip[] = [
  {
    symbol: "R",
    title: "O 'R' Caipira",
    description: "Em inglês, o 'R' nunca vibra na garganta (como em 'rato'). Ele é sempre enrolado, como no sotaque do interior: 'poRta', 'veRde'.",
    example: "Red → 'Red' (não 'Héd')",
    color: "text-brand-400"
  },
  {
    symbol: "TH",
    title: "A Língua no Dente",
    description: "O terror dos brasileiros! Coloque a ponta da língua entre os dentes e sopre (som de vento) ou vibre (som de abelha).",
    example: "Think (sopra) / That (vibra)",
    color: "text-accent-cyan"
  },
  {
    symbol: "E",
    title: "O 'E' Final é Mudo",
    description: "Não fale a última letra! Brasileiros amam adicionar um 'i' no final (Love → 'Lóvi'). Corte o som antes.",
    example: "Love → 'Lâv' (pare no V)",
    color: "text-accent-lime"
  },
  {
    symbol: "ə",
    title: "O Schwa (Som Preguiçoso)",
    description: "O símbolo 'ə' soa como um 'Â' curto e relaxado. É o som mais comum do inglês em sílabas átonas.",
    example: "Banana → 'Buh-na-nuh'",
    color: "text-accent-violet"
  }
];

const JAPANESE_TIPS: Tip[] = [
  {
    symbol: "R",
    title: "O 'R' Japonês",
    description: "Não é 'H' (rato) nem 'R' inglês (car). É uma batidinha rápida da língua no céu da boca, parecido com o nosso 'R' de 'arara' ou 'caro'.",
    example: "Ramen → 'Lámen' / 'Dámen'",
    color: "text-red-400"
  },
  {
    symbol: "U",
    title: "O 'U' Discreto",
    description: "O som de 'U' no final das palavras (desu, masu) é quase mudo. Não force o bico. É um sopro rápido.",
    example: "Desu → 'Dés(u)'",
    color: "text-brand-400"
  },
  {
    symbol: "H",
    title: "O 'H' Soprado",
    description: "Sempre tem som de 'R' do português (Rato). Nunca é mudo como em 'Hoje'.",
    example: "Hana → 'Rana'",
    color: "text-accent-lime"
  },
  {
    symbol: "TS",
    title: "TS (Tsunami)",
    description: "Um som único, como o final de 'Gats' ou o barulho de um prato quebrando. Língua atrás dos dentes.",
    example: "Tsunami → 'Tsu-na-mi'",
    color: "text-accent-cyan"
  }
];

const KOREAN_TIPS: Tip[] = [
  {
    symbol: "EO",
    title: "A Vogal 'EO' (eo)",
    description: "Um som entre 'Ó' e 'Â'. Abra bem a boca verticalmente. Não é 'Ê' fechado.",
    example: "Seoul → 'Só-ul'",
    color: "text-brand-400"
  },
  {
    symbol: "EU",
    title: "A Vogal 'EU' (eu)",
    description: "Sorria com os dentes cerrados e tente dizer 'U'. É um som tenso, horizontal.",
    example: "Eu → Som de nojo 'Urgh'",
    color: "text-accent-violet"
  },
  {
    symbol: "J/CH",
    title: "Sons Suaves",
    description: "O 'J' e 'CH' coreanos são muito suaves e soprados, não vibrantes como no português.",
    example: "Jimin → 'Dji-min'",
    color: "text-accent-lime"
  },
  {
    symbol: "BATCHIM",
    title: "Consoantes Finais",
    description: "Consoantes no final da sílaba (K, T, P) são 'engolidas'. Não solte o ar. Corte o som abruptamente.",
    example: "Kimchi → 'Kim-tchi' (feche o M)",
    color: "text-red-400"
  }
];

interface TipsPanelProps {
  langCode: string;
}

export const TipsPanel: React.FC<TipsPanelProps> = ({ langCode }) => {
  let tips: Tip[] = [];
  let title = langCode;

  if (langCode.startsWith('en')) {
    tips = ENGLISH_TIPS;
    title = "Inglês";
  } else if (langCode === 'ja') {
    tips = JAPANESE_TIPS;
    title = "Japonês";
  } else if (langCode === 'ko') {
    tips = KOREAN_TIPS;
    title = "Coreano";
  }

  const hasTips = tips.length > 0;

  return (
    <div className="bg-white/5 rounded-xl border border-white/5 flex flex-col h-full max-h-[500px]">
      <div className="p-4 border-b border-white/5 bg-white/5 sticky top-0 z-10 backdrop-blur-sm rounded-t-xl">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${hasTips ? 'bg-brand-500' : 'bg-slate-500'}`}></span>
          Dicas: {title}
        </h3>
      </div>
      
      <div className="overflow-y-auto p-2 scrollbar-thin space-y-2 h-full">
        {hasTips ? (
          tips.map((tip, idx) => (
            <div key={idx} className="group p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center font-mono font-bold text-lg shadow-inner shrink-0 ${tip.color}`}>
                  {tip.symbol}
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm font-bold ${tip.color} mb-1`}>{tip.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-2">
                    {tip.description}
                  </p>
                  <div className="inline-block px-2 py-1 rounded bg-black/20 text-[10px] font-mono text-slate-500 border border-white/5">
                    Ex: <span className="text-slate-300">{tip.example}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <span className="text-2xl opacity-50">🌍</span>
            </div>
            <p className="text-sm font-bold text-slate-400 mb-1">Idioma: {langCode}</p>
            <p className="text-xs text-slate-600 max-w-[200px]">
              Dicas específicas para este idioma ainda não estão disponíveis, mas a tradução fonética funciona normalmente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};