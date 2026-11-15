import type { Lang } from '@falagringo/engine';
import { useCallback, useSyncExternalStore } from 'react';

/**
 * Áudio pela voz sintética do navegador (Web Speech API). Não grava, não envia nada e não usa voz de pessoa real.
 * Degrada bem: sem a API ou sem voz instalada no idioma, `available` é falso e a tela explica o motivo.
 */
const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function subscribe(onChange: () => void) {
  if (!supported) return () => {};
  speechSynthesis.addEventListener('voiceschanged', onChange);
  return () => speechSynthesis.removeEventListener('voiceschanged', onChange);
}

let cache: { key: string; voices: SpeechSynthesisVoice[] } | undefined;
function getVoices(): SpeechSynthesisVoice[] {
  if (!supported) return [];
  const voices = speechSynthesis.getVoices();
  const key = voices.map((v) => v.voiceURI).join('|');
  if (cache?.key !== key) cache = { key, voices }; // referência estável para o useSyncExternalStore
  return cache.voices;
}

/** Vozes de efeito do macOS (Eddy, Flo, Grandma, Bad News…): existem em vários idiomas, mas não servem para pronúncia. */
const NOVELTY =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Junior|Ralph|Fred|Kathy)\b/u;
/** Variante pedida sem voz própria: regiões equivalentes, em ordem (o espanhol latino-americano não tem voz es-419). */
const REGIONS: Partial<Record<string, string[]>> = {
  'es-419': ['es-mx', 'es-us', 'es-co', 'es-ar', 'es-cl'],
};

/**
 * Melhor voz para o idioma. Ordem: variante exata (en-GB) → região equivalente (es-419 → es-MX) → qualquer do mesmo
 * idioma (en-*). Em cada grupo: a voz padrão do sistema, depois vozes que não são de efeito, depois as locais.
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: Lang,
): SpeechSynthesisVoice | undefined {
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const want = lang.toLowerCase();
  const base = want.split('-')[0]!;
  const score = (v: SpeechSynthesisVoice) =>
    (v.default ? 4 : 0) + (NOVELTY.test(v.name) ? 0 : 2) + (v.localService ? 1 : 0);
  const best = (list: SpeechSynthesisVoice[]) =>
    list.reduce<SpeechSynthesisVoice | undefined>((a, v) => (!a || score(v) > score(a) ? v : a), undefined);
  const groups = [
    voices.filter((v) => norm(v.lang) === want),
    ...(REGIONS[want] ?? []).map((r) => voices.filter((v) => norm(v.lang) === r)),
    voices.filter((v) => norm(v.lang).split('-')[0] === base),
  ];
  for (const g of groups) {
    const v = best(g);
    if (v) return v;
  }
  return undefined;
}

export type SpeechState =
  | { available: true; speak: (text: string) => void }
  | { available: false; reason: string; speak?: undefined };

export function useSpeech(lang: Lang, languageName: string): SpeechState {
  const voices = useSyncExternalStore(subscribe, getVoices, () => []);
  const voice = pickVoice(voices, lang);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !voice) return;
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.85;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    },
    [voice],
  );

  if (!supported) return { available: false, reason: 'Este navegador não tem voz sintética.' };
  if (!voice)
    return { available: false, reason: `Nenhuma voz em ${languageName} instalada neste navegador.` };
  return { available: true, speak };
}
