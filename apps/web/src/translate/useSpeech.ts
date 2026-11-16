import type { Lang } from '@falagringo/engine';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { load, save } from '../app/storage';

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
 * Escolha automática: a melhor voz LOCAL do idioma. Voz online (Google, Microsoft…) nunca é automática, porque o
 * navegador envia o texto ao provedor para gerar o áudio; a pessoa pode escolhê-la na lista (`voiceOptions`).
 */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: Lang,
): SpeechSynthesisVoice | undefined {
  return voiceOptions(voices, lang).find((v) => !isOnline(v));
}

/**
 * Vozes oferecidas para o idioma, da melhor para a pior: locais antes das online. Em cada uma, variante exata
 * (en-GB) → região equivalente (es-419 → es-MX) → qualquer do mesmo idioma (en-*), e no mesmo grupo a voz padrão do
 * sistema primeiro. Vozes de efeito ficam de fora quando há outra.
 */
export function voiceOptions(voices: readonly SpeechSynthesisVoice[], lang: Lang): SpeechSynthesisVoice[] {
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const want = lang.toLowerCase();
  const base = want.split('-')[0]!;
  const score = (v: SpeechSynthesisVoice) => (v.default ? 2 : 0) + (NOVELTY.test(v.name) ? 0 : 1);
  // ordem estável: maior pontuação primeiro; empate fica na ordem do sistema
  const sorted = (list: SpeechSynthesisVoice[]) =>
    list
      .map((v, i) => [v, i] as const)
      .sort(([a, i], [b, j]) => score(b) - score(a) || i - j)
      .map(([v]) => v);
  const groups = [
    voices.filter((v) => norm(v.lang) === want),
    ...(REGIONS[want] ?? []).map((r) => voices.filter((v) => norm(v.lang) === r)),
    voices.filter((v) => norm(v.lang).split('-')[0] === base),
  ];
  const seen = new Set<SpeechSynthesisVoice>();
  const all = groups.flatMap(sorted).filter((v) => !seen.has(v) && !!seen.add(v));
  const real = all.filter((v) => !NOVELTY.test(v.name));
  const list = real.length ? real : all;
  return [...list.filter((v) => !isOnline(v)), ...list.filter(isOnline)];
}

export interface SpeechState {
  available: boolean;
  /** Por que não há áudio (sem API, sem voz, ou só vozes online ainda não escolhidas). */
  reason?: string;
  speak?: (text: string) => void;
  /** Voz em uso. */
  voice?: SpeechSynthesisVoice;
  /** Vozes do idioma para trocar: algumas vozes do sistema falham no Chrome e ele fala com a voz padrão. */
  options: SpeechSynthesisVoice[];
  choose: (voiceURI: string) => void;
}

/** Voz escolhida por idioma (voiceURI), guardada só neste navegador. */
const CHOSEN = 'fg:voz';

export function useSpeech(lang: Lang, languageName: string): SpeechState {
  const voices = useSyncExternalStore(subscribe, getVoices, () => []);
  const [chosen, setChosen] = useState<Partial<Record<string, string>>>(() => load(CHOSEN, {}));
  const options = voiceOptions(voices, lang);
  const voice = options.find((v) => v.voiceURI === chosen[lang]) ?? pickVoice(voices, lang);

  const choose = useCallback(
    (voiceURI: string) => {
      setChosen((prev) => {
        const next = { ...prev, [lang]: voiceURI };
        save(CHOSEN, next);
        return next;
      });
    },
    [lang],
  );

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

  if (!supported)
    return { available: false, reason: 'Este navegador não tem voz sintética.', options: [], choose };
  if (!voice)
    return {
      available: false,
      reason: options.length
        ? `Só há voz online em ${languageName}: escolha abaixo se quiser usá-la.`
        : `Nenhuma voz em ${languageName} instalada neste navegador.`,
      options,
      choose,
    };
  return { available: true, speak, voice, options, choose };
}

/** Voz online: o navegador envia o texto ao provedor (Google, Microsoft…) para gerar o áudio. */
export const isOnline = (v: SpeechSynthesisVoice) => !v.localService;

/** Nome do provedor de uma voz online, para o aviso. */
export const voiceProvider = (v: SpeechSynthesisVoice) =>
  /^Google\b/u.test(v.name) ? 'Google' : /^Microsoft\b/u.test(v.name) ? 'Microsoft' : 'provedor da voz';
