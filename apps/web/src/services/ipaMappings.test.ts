import { describe, expect, it } from 'vitest';
import { convertIpaToPtBr } from './ipaMappings';

// Testes da conversão v1 — servem de rede de segurança até o motor v2 (Fase 3) substituí-la.
describe('convertIpaToPtBr (v1)', () => {
  it('converte africadas antes de segmentos simples', () => {
    expect(convertIpaToPtBr('tʃ')).toBe('tch');
  });
  it('mapeia θ para f', () => {
    expect(convertIpaToPtBr('θæŋk')).toBe('féngk');
  });
  it('retorna vazio para entrada vazia', () => {
    expect(convertIpaToPtBr('')).toBe('');
  });
});
