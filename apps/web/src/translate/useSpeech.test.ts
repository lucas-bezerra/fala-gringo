import { describe, expect, it } from 'vitest';
import { pickVoice, voiceOptions } from './useSpeech';

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
  v('Google 日本語', 'ja-JP', { localService: false }),
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
  it('voz online nunca é a escolha automática (envia o texto ao provedor)', () => {
    expect(pickVoice(VOICES, 'ja-JP')).toBeUndefined();
  });
});

describe('voiceOptions', () => {
  it('lista as vozes do idioma para trocar: locais primeiro, online por último, sem vozes de efeito', () => {
    expect(voiceOptions(VOICES, 'es-ES').map((x) => x.name)).toEqual(['Mónica', 'Paulina', 'Google español']);
    expect(voiceOptions(VOICES, 'es-419').map((x) => x.name)).toEqual([
      'Paulina',
      'Mónica',
      'Google español',
    ]);
    expect(voiceOptions(VOICES, 'ja-JP').map((x) => x.name)).toEqual(['Google 日本語']);
  });
});
