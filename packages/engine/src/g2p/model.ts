/**
 * Inferência do modelo G2P (T3.9) em TypeScript puro, sem DOM nem Node: os bytes do modelo são injetados.
 *
 * Reproduz `tools/g2p/model.py` (decodificação gulosa) com os pesos de `tools/g2p/export.py`:
 *   g2p.json  configuração, vocabulários e índice dos tensores
 *   g2p.bin   pesos little-endian (float16 ou float32), na ordem do índice
 * O teste `model.test.ts` confere que a saída é IGUAL à do PyTorch nas fixtures do export.
 * Mudou `model.py`? Mude esta inferência junto (e gere as fixtures de novo).
 *
 * Arquitetura (pre-LN), por caractere:
 *   x = emb(tokens) · √d + posição senoidal
 *   codificador:    x += attn(ln1(x));  x += ff(ln2(x))                                   → enc_ln
 *   decodificador:  y += self_attn(ln1(y)) [causal]; y += cross_attn(ln2(y), mem); y += ff(ln3(y)) → dec_ln → out
 */

export interface G2pConfig {
  src_vocab: number;
  tgt_vocab: number;
  d_model: number;
  heads: number;
  enc_layers: number;
  dec_layers: number;
  ff: number;
  max_len: number;
}

export interface G2pTensorRef {
  name: string;
  shape: number[];
  offset: number;
  bytes: number;
}

/** Conteúdo do `g2p.json` (só o que a inferência usa; o resto documenta o treino). */
export interface G2pManifest {
  format: 'falagringo-g2p';
  version: 1;
  lang: string;
  dtype: 'float16' | 'float32';
  config: G2pConfig;
  specials: { pad: number; bos: number; eos: number; unk: number };
  src_vocab: string[];
  tgt_vocab: string[];
  tensors: G2pTensorRef[];
  training?: unknown;
}

/** Converte um float16 (IEEE 754, binário de 16 bits) em número. */
export function halfToFloat(h: number): number {
  const sign = h & 0x8000 ? -1 : 1;
  const exp = (h >> 10) & 0x1f;
  const frac = h & 0x3ff;
  if (exp === 0) return sign * frac * 2 ** -24; // zero e subnormais
  if (exp === 31) return frac ? NaN : sign * Infinity;
  return sign * (1 + frac / 1024) * 2 ** (exp - 15);
}

interface Linear {
  w: Float32Array; // [out, in], linha por saída (como o nn.Linear)
  b: Float32Array;
  inp: number;
  out: number;
}
interface Norm {
  g: Float32Array;
  b: Float32Array;
}
interface Attn {
  q: Linear;
  k: Linear;
  v: Linear;
  o: Linear;
}
interface Ff {
  lin1: Linear;
  lin2: Linear;
}
interface EncLayer {
  ln1: Norm;
  ln2: Norm;
  attn: Attn;
  ff: Ff;
}
interface DecLayer {
  ln1: Norm;
  ln2: Norm;
  ln3: Norm;
  selfAttn: Attn;
  crossAttn: Attn;
  ff: Ff;
}

const LN_EPS = 1e-5; // padrão do nn.LayerNorm

function linear(l: Linear, x: Float32Array, xOff: number, y: Float32Array, yOff: number): void {
  const { w, b, inp, out } = l;
  const end = inp - (inp % 4);
  for (let o = 0; o < out; o++) {
    // 4 somas independentes: o V8 executa em paralelo (≈2× mais rápido que uma soma só)
    let s0 = 0,
      s1 = 0,
      s2 = 0,
      s3 = 0;
    const row = o * inp;
    let i = 0;
    for (; i < end; i += 4) {
      s0 += w[row + i] * x[xOff + i];
      s1 += w[row + i + 1] * x[xOff + i + 1];
      s2 += w[row + i + 2] * x[xOff + i + 2];
      s3 += w[row + i + 3] * x[xOff + i + 3];
    }
    for (; i < inp; i++) s0 += w[row + i] * x[xOff + i];
    y[yOff + o] = s0 + s1 + s2 + s3 + b[o];
  }
}

function layerNorm(n: Norm, x: Float32Array, xOff: number, y: Float32Array, yOff: number, d: number): void {
  let mean = 0;
  for (let i = 0; i < d; i++) mean += x[xOff + i];
  mean /= d;
  let v = 0;
  for (let i = 0; i < d; i++) {
    const t = x[xOff + i] - mean;
    v += t * t;
  }
  const inv = 1 / Math.sqrt(v / d + LN_EPS);
  for (let i = 0; i < d; i++) y[yOff + i] = (x[xOff + i] - mean) * inv * n.g[i] + n.b[i];
}

/** Posição senoidal (como `sinusoidal()` do model.py). */
function sinusoidal(maxLen: number, d: number): Float32Array {
  const pe = new Float32Array(maxLen * d);
  for (let p = 0; p < maxLen; p++) {
    for (let i = 0; i < d; i += 2) {
      const div = Math.exp(i * (-Math.log(10000) / d));
      pe[p * d + i] = Math.sin(p * div);
      if (i + 1 < d) pe[p * d + i + 1] = Math.cos(p * div);
    }
  }
  return pe;
}

/**
 * Atenção de UMA consulta (`q`, d valores) sobre `n` linhas de `k`/`v` (n × d), cabeça a cabeça.
 * Resultado (antes da projeção `o`) em `out`. `scores` é área de trabalho com ao menos `n` posições.
 */
function attend(
  q: Float32Array,
  qOff: number,
  k: Float32Array,
  v: Float32Array,
  n: number,
  d: number,
  heads: number,
  scores: Float64Array,
  out: Float32Array,
): void {
  const dk = d / heads;
  const scale = Math.sqrt(dk);
  for (let h = 0; h < heads; h++) {
    const ho = h * dk;
    let max = -Infinity;
    for (let j = 0; j < n; j++) {
      let s = 0;
      const kr = j * d + ho;
      for (let i = 0; i < dk; i++) s += q[qOff + ho + i] * k[kr + i];
      s /= scale;
      scores[j] = s;
      if (s > max) max = s;
    }
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const e = Math.exp(scores[j] - max);
      scores[j] = e;
      sum += e;
    }
    for (let i = 0; i < dk; i++) {
      let acc = 0;
      for (let j = 0; j < n; j++) acc += scores[j] * v[j * d + ho + i];
      out[ho + i] = acc / sum;
    }
  }
}

export class G2pModel {
  readonly lang: string;
  readonly config: G2pConfig;
  private readonly srcIndex: Map<string, number>;
  private readonly tgtVocab: readonly string[];
  private readonly specials: G2pManifest['specials'];
  private readonly srcEmb: Float32Array;
  private readonly tgtEmb: Float32Array;
  private readonly pos: Float32Array;
  private readonly enc: EncLayer[];
  private readonly dec: DecLayer[];
  private readonly encLn: Norm;
  private readonly decLn: Norm;
  private readonly out: Linear;

  constructor(manifest: G2pManifest, weights: ArrayBuffer) {
    validateManifest(manifest);
    const cfg = manifest.config;
    const d = cfg.d_model;
    this.lang = manifest.lang;
    this.config = cfg;
    this.specials = manifest.specials;
    this.tgtVocab = manifest.tgt_vocab;
    this.srcIndex = new Map(manifest.src_vocab.map((s, i) => [s, i]));

    const view = new DataView(weights);
    const byName = new Map(manifest.tensors.map((t) => [t.name, t]));
    const width = manifest.dtype === 'float16' ? 2 : 4;
    const total = manifest.tensors.reduce((n, t) => n + t.bytes, 0);
    if (weights.byteLength !== total)
      throw new Error(`g2p.bin tem ${weights.byteLength} bytes; o g2p.json descreve ${total}.`);

    const tensor = (name: string, shape: number[]): Float32Array => {
      const ref = byName.get(name);
      if (!ref) throw new Error(`Tensor ausente no g2p.json: ${name}`);
      if (ref.shape.join('×') !== shape.join('×'))
        throw new Error(`Tensor ${name} com forma ${ref.shape.join('×')}; esperado ${shape.join('×')}.`);
      const count = shape.reduce((a, b) => a * b, 1);
      if (ref.bytes !== count * width || ref.offset + ref.bytes > weights.byteLength)
        throw new Error(`Tensor ${name} com tamanho ou posição inválidos no g2p.bin.`);
      const arr = new Float32Array(count);
      if (width === 2)
        for (let i = 0; i < count; i++) arr[i] = halfToFloat(view.getUint16(ref.offset + 2 * i, true));
      else for (let i = 0; i < count; i++) arr[i] = view.getFloat32(ref.offset + 4 * i, true);
      return arr;
    };
    const lin = (name: string, out: number, inp: number): Linear => ({
      w: tensor(`${name}.weight`, [out, inp]),
      b: tensor(`${name}.bias`, [out]),
      inp,
      out,
    });
    const norm = (name: string): Norm => ({
      g: tensor(`${name}.weight`, [d]),
      b: tensor(`${name}.bias`, [d]),
    });
    const attn = (name: string): Attn => ({
      q: lin(`${name}.q`, d, d),
      k: lin(`${name}.k`, d, d),
      v: lin(`${name}.v`, d, d),
      o: lin(`${name}.o`, d, d),
    });
    const ff = (name: string): Ff => ({
      lin1: lin(`${name}.lin1`, cfg.ff, d),
      lin2: lin(`${name}.lin2`, d, cfg.ff),
    });

    this.srcEmb = tensor('src_emb.weight', [cfg.src_vocab, d]);
    this.tgtEmb = tensor('tgt_emb.weight', [cfg.tgt_vocab, d]);
    this.enc = Array.from({ length: cfg.enc_layers }, (_, i) => ({
      ln1: norm(`enc.${i}.ln1`),
      ln2: norm(`enc.${i}.ln2`),
      attn: attn(`enc.${i}.attn`),
      ff: ff(`enc.${i}.ff`),
    }));
    this.dec = Array.from({ length: cfg.dec_layers }, (_, i) => ({
      ln1: norm(`dec.${i}.ln1`),
      ln2: norm(`dec.${i}.ln2`),
      ln3: norm(`dec.${i}.ln3`),
      selfAttn: attn(`dec.${i}.self_attn`),
      crossAttn: attn(`dec.${i}.cross_attn`),
      ff: ff(`dec.${i}.ff`),
    }));
    this.encLn = norm('enc_ln');
    this.decLn = norm('dec_ln');
    this.out = lin('out', cfg.tgt_vocab, d);
    this.pos = sinusoidal(cfg.max_len, d);
  }

  /** O símbolo existe no vocabulário de entrada (senão vira `<unk>`). */
  knows(symbol: string): boolean {
    const i = this.srcIndex.get(symbol);
    return i !== undefined && i >= 4;
  }

  /** Maior palavra aceita (a entrada leva um `</s>` no fim e cabe na tabela de posições). */
  get maxWordLength(): number {
    return this.config.max_len - 1;
  }

  /**
   * IPA estimado para `word` (já em NFC e minúsculas, como no treino). Símbolos fora do vocabulário viram
   * `<unk>`, como no Python. Decodificação gulosa: o mesmo resultado do `G2P.greedy()`.
   */
  predict(word: string): string {
    const { bos, eos, unk } = this.specials;
    const cfg = this.config;
    const d = cfg.d_model;
    const src = [...word].map((ch) => this.srcIndex.get(ch) ?? unk);
    src.push(eos);
    const n = src.length;
    if (n > cfg.max_len) throw new RangeError(`Palavra com mais de ${this.maxWordLength} símbolos.`);

    const sqrtD = Math.sqrt(d);
    const scores = new Float64Array(cfg.max_len);
    const head = new Float32Array(d);
    const proj = new Float32Array(d);
    const hidden = new Float32Array(cfg.ff);

    // ---- codificador: todas as posições de uma vez
    const x = new Float32Array(n * d);
    for (let p = 0; p < n; p++)
      for (let i = 0; i < d; i++) x[p * d + i] = this.srcEmb[src[p] * d + i] * sqrtD + this.pos[p * d + i];
    const h = new Float32Array(n * d);
    const q = new Float32Array(n * d);
    const k = new Float32Array(n * d);
    const v = new Float32Array(n * d);
    for (const L of this.enc) {
      for (let p = 0; p < n; p++) layerNorm(L.ln1, x, p * d, h, p * d, d);
      for (let p = 0; p < n; p++) {
        linear(L.attn.q, h, p * d, q, p * d);
        linear(L.attn.k, h, p * d, k, p * d);
        linear(L.attn.v, h, p * d, v, p * d);
      }
      for (let p = 0; p < n; p++) {
        attend(q, p * d, k, v, n, d, cfg.heads, scores, head);
        linear(L.attn.o, head, 0, proj, 0);
        for (let i = 0; i < d; i++) x[p * d + i] += proj[i];
      }
      for (let p = 0; p < n; p++) {
        layerNorm(L.ln2, x, p * d, h, p * d, d);
        this.feedForward(L.ff, h, p * d, hidden, proj);
        for (let i = 0; i < d; i++) x[p * d + i] += proj[i];
      }
    }
    const mem = new Float32Array(n * d);
    for (let p = 0; p < n; p++) layerNorm(this.encLn, x, p * d, mem, p * d, d);

    // ---- decodificador: chaves/valores da memória calculados uma vez por camada
    const crossK = this.dec.map((L) => {
      const out = new Float32Array(n * d);
      for (let p = 0; p < n; p++) linear(L.crossAttn.k, mem, p * d, out, p * d);
      return out;
    });
    const crossV = this.dec.map((L) => {
      const out = new Float32Array(n * d);
      for (let p = 0; p < n; p++) linear(L.crossAttn.v, mem, p * d, out, p * d);
      return out;
    });
    // cache da autoatenção causal: as posições anteriores não mudam quando um novo símbolo entra
    const selfK = this.dec.map(() => new Float32Array(cfg.max_len * d));
    const selfV = this.dec.map(() => new Float32Array(cfg.max_len * d));

    const y = new Float32Array(d);
    const hy = new Float32Array(d);
    const qy = new Float32Array(d);
    const logits = new Float32Array(cfg.tgt_vocab);
    const ids: number[] = [];
    let token = bos;
    for (let t = 0; t < cfg.max_len - 1; t++) {
      for (let i = 0; i < d; i++) y[i] = this.tgtEmb[token * d + i] * sqrtD + this.pos[t * d + i];
      this.dec.forEach((L, li) => {
        layerNorm(L.ln1, y, 0, hy, 0, d);
        linear(L.selfAttn.q, hy, 0, qy, 0);
        linear(L.selfAttn.k, hy, 0, selfK[li], t * d);
        linear(L.selfAttn.v, hy, 0, selfV[li], t * d);
        attend(qy, 0, selfK[li], selfV[li], t + 1, d, cfg.heads, scores, head);
        linear(L.selfAttn.o, head, 0, proj, 0);
        for (let i = 0; i < d; i++) y[i] += proj[i];

        layerNorm(L.ln2, y, 0, hy, 0, d);
        linear(L.crossAttn.q, hy, 0, qy, 0);
        attend(qy, 0, crossK[li], crossV[li], n, d, cfg.heads, scores, head);
        linear(L.crossAttn.o, head, 0, proj, 0);
        for (let i = 0; i < d; i++) y[i] += proj[i];

        layerNorm(L.ln3, y, 0, hy, 0, d);
        this.feedForward(L.ff, hy, 0, hidden, proj);
        for (let i = 0; i < d; i++) y[i] += proj[i];
      });
      layerNorm(this.decLn, y, 0, hy, 0, d);
      linear(this.out, hy, 0, logits, 0);
      let best = 0;
      for (let i = 1; i < logits.length; i++) if (logits[i] > logits[best]) best = i; // 1º máximo, como o argmax
      if (best === eos) break;
      ids.push(best);
      token = best;
    }
    // como Vocab.decode(): especiais (pad, bos, unk) somem da saída
    return ids
      .filter((i) => i >= 4)
      .map((i) => this.tgtVocab[i])
      .join('');
  }

  private feedForward(f: Ff, x: Float32Array, xOff: number, hidden: Float32Array, out: Float32Array): void {
    linear(f.lin1, x, xOff, hidden, 0);
    for (let i = 0; i < hidden.length; i++) if (hidden[i] < 0) hidden[i] = 0;
    linear(f.lin2, hidden, 0, out, 0);
  }
}

function validateManifest(m: G2pManifest): void {
  if (m?.format !== 'falagringo-g2p') throw new Error('Arquivo não é um modelo G2P do FalaGringo.');
  if (m.version !== 1) throw new Error(`Versão ${String(m.version)} do modelo G2P não suportada.`);
  if (m.dtype !== 'float16' && m.dtype !== 'float32')
    throw new Error(`Tipo de peso não suportado: ${m.dtype}`);
  const { pad, bos, eos, unk } = m.specials;
  if (pad !== 0 || bos !== 1 || eos !== 2 || unk !== 3)
    throw new Error('Índices especiais inesperados no G2P.');
  const c = m.config;
  if (m.src_vocab.length !== c.src_vocab || m.tgt_vocab.length !== c.tgt_vocab)
    throw new Error('Vocabulário do G2P não bate com a configuração.');
  if (c.d_model % c.heads !== 0) throw new Error('d_model do G2P não é múltiplo do número de cabeças.');
}

/** Carrega um modelo a partir do `g2p.json` (já lido) e dos bytes do `g2p.bin`. */
export function loadG2pModel(manifest: unknown, weights: ArrayBuffer): G2pModel {
  return new G2pModel(manifest as G2pManifest, weights);
}
