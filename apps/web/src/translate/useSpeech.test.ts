import { describe, expect, it } from 'vitest';
import { pickVoice } from './useSpeech';

const v = (name: string, lang: string, extra: Partial<SpeechSynthesisVoice> = {}) =>
  ({ name, lang, localService: true, default: false, voiceURI: name, ...extra }) as SpeechSynthesisVoice;

// amostra real do macOS: as vozes de efeito vêm primeiro na lista
const VOICES = [
  v('Samantha', 'en-US', { default: true }),
  v('Albert', 'en-US'),
  v('Eddy (Spanish (Spain))', 'es-ES'),
  v('Mónica', 'es-ES'),
  v('Eddy (Spanish (Mexico))', 'es-MX'),
  v('Paulina', 'es-MX'),
  v('Eddy (Italian (Italy))', 'it-IT'),
  v('Alice', 'it-IT'),
  v('Daniel', 'en-GB'),
  v('Google español', 'es-ES', { localService: false }),
];

describe('pickVoice', () => {
  it('prefere voz de verdade às vozes de efeito', () => {
    expect(pickVoice(VOICES, 'es-ES')?.name).toBe('Mónica');
    expect(pickVoice(VOICES, 'it-IT')?.name).toBe('Alice');
  });
  it('espanhol latino-americano usa uma voz do México, não da Espanha', () => {
    expect(pickVoice(VOICES, 'es-419')?.name).toBe('Paulina');
  });
  it('variante exata e voz padrão', () => {
    expect(pickVoice(VOICES, 'en-GB')?.name).toBe('Daniel');
    expect(pickVoice(VOICES, 'en-US')?.name).toBe('Samantha');
  });
  it('sem voz do idioma: nada (a tela explica)', () => {
    expect(pickVoice(VOICES, 'ko-KR')).toBeUndefined();
  });
});
