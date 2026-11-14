/**
 * Contraste dos tokens de cor nos dois temas (T4.11). O axe só mede o que está na tela no momento do teste;
 * aqui entram estados de hover, foco e combinações que aparecem só às vezes.
 * Mínimos WCAG: texto 4,5:1 (1.4.3); contorno de foco e bordas de controle 3:1 (1.4.11).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');

function tokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
  );
}

const light = tokens(css.slice(css.indexOf('@theme'), css.indexOf('/* ---- Tema escuro')));
const darkBlock = css.slice(css.indexOf(":root[data-theme='dark'] {"));
const dark = { ...light, ...tokens(darkBlock.slice(0, darkBlock.indexOf('}'))) };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const WHITE = '#ffffff';
/** [texto, fundo, mínimo] — nomes de tokens ou hex. */
const PAIRS: [string, string, number][] = [
  ...['canvas', 'surface', 'subtle'].flatMap((bg) =>
    ['ink', 'ink-2', 'muted'].map((fg): [string, string, number] => [fg, bg, 4.5]),
  ),
  ['ink', 'segment', 4.5], // texto de aba/segmento selecionado e hover discreto
  ['ink-2', 'segment', 4.5],
  ['accent-ink', 'accent-soft', 4.5], // item de navegação atual, cartão selecionado
  ['ink', 'accent-soft', 4.5],
  [WHITE, 'accent', 4.5], // botão primário e chip ligado
  [WHITE, 'accent-strong', 4.5], // botão primário em hover
  ['special', 'surface', 4.5], // som especial (laranja)
  ['special', 'accent-soft', 4.5], // som especial no cartão selecionado
  ['special-ink', 'special-soft', 4.5],
  ['ok', 'ok-soft', 4.5], // selo "Disponível offline"
  ['focus', 'canvas', 3], // contorno de foco
  ['focus', 'surface', 3],
  ['field', 'surface', 3], // borda de campo de texto (identifica o campo)
  ['field', 'canvas', 3],
];

describe.each([
  ['claro', light],
  ['escuro', dark],
] as const)('tema %s', (_, t) => {
  it.each(PAIRS)('%s sobre %s ≥ %s:1', (fg, bg, min) => {
    const color = (k: string) => (k.startsWith('#') ? k : t[k]);
    expect(color(fg), `token ${fg}`).toBeDefined();
    expect(color(bg), `token ${bg}`).toBeDefined();
    expect(contrast(color(fg)!, color(bg)!)).toBeGreaterThanOrEqual(min);
  });
});
