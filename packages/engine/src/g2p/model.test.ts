/**
 * A inferência em TypeScript tem de dar EXATAMENTE a saída do PyTorch (tools/g2p/model.py) com os mesmos pesos.
 *
 * - `fixtures/g2p-tiny/`: modelo minúsculo (d=32, 1 camada, ~26 mil parâmetros), roda no CI. Para gerar de novo,
 *   em tools/g2p:
 *     .venv/bin/python train.py --lang en-US --out runs/tiny --d-model 32 --heads 2 --layers 1 --ff 64 \
 *       --epochs 6 --limit 20000 --warmup 200 --eval-every 3 --device cpu
 *     .venv/bin/python export.py --lang en-US --model runs/tiny/best.pt --out runs/tiny/export
 *   e copie g2p.json, g2p.bin e fixtures.tsv para packages/engine/fixtures/g2p-tiny/.
 * - `tools/g2p/export/{idioma}/`: modelos reais (fora do git). Só rodam na máquina que os tem.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { createG2pEstimator, modelInput } from './estimator';
import { halfToFloat, loadG2pModel, type G2pManifest, type G2pModel } from './model';

const here = path.dirname(fileURLToPath(import.meta.url));
const TINY = path.resolve(here, '../../fixtures/g2p-tiny');
const EXPORTS = path.resolve(here, '../../../../tools/g2p/export');

function readExport(dir: string) {
  const manifest = JSON.parse(readFileSync(path.join(dir, 'g2p.json'), 'utf8')) as G2pManifest;
  const buf = readFileSync(path.join(dir, 'g2p.bin'));
  const weights = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const fixtures = readFileSync(path.join(dir, 'fixtures.tsv'), 'utf8')
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map((l) => l.split('\t') as [string, string?]);
  return { manifest, weights, fixtures };
}

/** Palavras cuja saída difere das fixtures do PyTorch. */
function mismatches(model: G2pModel, fixtures: [string, string?][]): string[] {
  return fixtures
    .map(([word, expected = '']) => [word, expected, model.predict(word)])
    .filter(([, expected, got]) => expected !== got)
    .map(([word, expected, got]) => `${word}: PyTorch ${expected} ≠ TS ${got}`);
}

describe('halfToFloat', () => {
  it.each([
    [0x0000, 0],
    [0x3c00, 1],
    [0xc000, -2],
    [0x3555, 0.333251953125],
    [0x7bff, 65504],
    [0x0001, 2 ** -24],
    [0x03ff, 1023 * 2 ** -24],
    [0x7c00, Infinity],
    [0xfc00, -Infinity],
  ])('0x%s → %s', (h, expected) => expect(halfToFloat(h)).toBe(expected));

  it('zero negativo e NaN', () => {
    expect(Object.is(halfToFloat(0x8000), -0)).toBe(true);
    expect(halfToFloat(0x7e00)).toBeNaN();
  });
});

describe('G2pModel (modelo de teste)', () => {
  const tiny = readExport(TINY);

  it('reproduz as 300 fixtures do PyTorch (float16)', () => {
    const model = loadG2pModel(tiny.manifest, tiny.weights);
    expect(tiny.fixtures).toHaveLength(300);
    expect(mismatches(model, tiny.fixtures)).toEqual([]);
  });

  it('lê pesos em float32 com o mesmo resultado', () => {
    const src = new DataView(tiny.weights);
    const out = new DataView(new ArrayBuffer(tiny.weights.byteLength * 2));
    for (let i = 0; i < tiny.weights.byteLength / 2; i++)
      out.setFloat32(4 * i, halfToFloat(src.getUint16(2 * i, true)), true);
    const manifest: G2pManifest = {
      ...tiny.manifest,
      dtype: 'float32',
      tensors: tiny.manifest.tensors.map((t) => ({ ...t, offset: t.offset * 2, bytes: t.bytes * 2 })),
    };
    expect(mismatches(loadG2pModel(manifest, out.buffer), tiny.fixtures)).toEqual([]);
  });

  it('recusa arquivos inválidos', () => {
    expect(() => loadG2pModel({ ...tiny.manifest, format: 'outro' }, tiny.weights)).toThrow(
      /não é um modelo/,
    );
    expect(() => loadG2pModel({ ...tiny.manifest, version: 2 }, tiny.weights)).toThrow(/Versão 2/);
    expect(() => loadG2pModel(tiny.manifest, tiny.weights.slice(0, 100))).toThrow(/bytes/);
    const missing = { ...tiny.manifest, tensors: tiny.manifest.tensors.filter((t) => t.name !== 'out.bias') };
    expect(() => loadG2pModel(missing, tiny.weights.slice(0, tiny.weights.byteLength - 96))).toThrow(
      /ausente.*out\.bias/,
    );
  });

  it('palavra longa demais é recusada; símbolo desconhecido vira <unk>, como no Python', () => {
    const model = loadG2pModel(tiny.manifest, tiny.weights);
    expect(model.maxWordLength).toBe(63);
    expect(() => model.predict('a'.repeat(64))).toThrow(RangeError);
    expect(typeof model.predict('ab#c')).toBe('string');
  });
});

describe('estimador G2P', () => {
  const tiny = readExport(TINY);
  const model = loadG2pModel(tiny.manifest, tiny.weights);

  it('troca símbolos desconhecidos pela letra base ou desiste', () => {
    expect(modelInput(model, 'café')).toBe('cafe');
    expect(modelInput(model, "rock'n'roll")).toBe("rock'n'roll");
    expect(modelInput(model, 'москва')).toBeUndefined();
    expect(modelInput(model, 'r2d2')).toBeUndefined();
    expect(modelInput(model, 'a'.repeat(64))).toBeUndefined();
  });

  it('carrega o modelo uma vez por idioma e guarda as estimativas', async () => {
    const load = vi.fn(async () => model);
    const predict = vi.spyOn(model, 'predict');
    const estimator = createG2pEstimator({ load });
    const [a, b] = await Promise.all([
      estimator.estimate('zork', 'en-US'),
      estimator.estimate('zork', 'en-US'),
    ]);
    expect(a).toBe(model.predict('zork'));
    expect(b).toBe(a);
    await estimator.estimate('zork', 'en-US');
    expect(load).toHaveBeenCalledTimes(1);
    expect(predict).toHaveBeenCalledTimes(3); // 2 pedidos simultâneos antes do cache + a conferência acima
    predict.mockRestore();
  });

  it('idioma sem modelo não estima; falha de carga é tentada de novo', async () => {
    let fail = true;
    const load = vi.fn(async (lang: string) => {
      if (lang === 'fr-FR') return undefined;
      if (fail) throw new Error('rede');
      return model;
    });
    const estimator = createG2pEstimator({ load });
    expect(await estimator.estimate('bonjour', 'fr-FR')).toBeUndefined();
    await expect(estimator.estimate('zork', 'en-US')).rejects.toThrow('rede');
    fail = false;
    expect(await estimator.estimate('zork', 'en-US')).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(3);
  });
});

const realLangs = ['en-US', 'en-GB', 'fr-FR'].filter((l) => existsSync(path.join(EXPORTS, l, 'g2p.bin')));
describe.skipIf(!realLangs.length)('modelos reais (tools/g2p/export, só local)', () => {
  it.each(realLangs)(
    '%s: reproduz as 300 fixtures do PyTorch',
    (lang) => {
      const real = readExport(path.join(EXPORTS, lang));
      expect(mismatches(loadG2pModel(real.manifest, real.weights), real.fixtures)).toEqual([]);
    },
    60_000,
  );
});
