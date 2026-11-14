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

/** Melhor voz para o idioma: a variante exata (en-GB); senão, qualquer do mesmo idioma (en-*). */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: Lang,
): SpeechSynthesisVoice | undefined {
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const want = lang.toLowerCase();
  const base = want.split('-')[0]!;
  return (
    voices.find((v) => norm(v.lang) === want && v.localService) ??
    voices.find((v) => norm(v.lang) === want) ??
    voices.find((v) => norm(v.lang).split('-')[0] === base)
  );
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
