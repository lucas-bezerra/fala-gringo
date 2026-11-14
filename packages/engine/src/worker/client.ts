/**
 * Lado da tela (T3.10): conversa com o motor no Web Worker. A tela nunca trava — a conversão roda fora da
 * thread principal.
 *
 *   const client = new EngineClient(new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' }));
 *   const r = await client.convertLatest(texto, 'en-US');   // undefined se já houver um pedido mais novo
 */
import type { ConversionResult, ConvertOptions, Lang } from '../types';
import type { EngineRequestBody, EngineResponse, MessagePortLike } from './protocol';

export class EngineClient {
  private nextId = 1;
  private latestId = 0;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

  constructor(private readonly port: MessagePortLike) {
    port.addEventListener('message', (event) => {
      const res = event.data as EngineResponse;
      const p = this.pending.get(res.id);
      if (!p) return;
      this.pending.delete(res.id);
      if (res.ok) p.resolve(res.result);
      else {
        const err = new Error(res.error);
        err.name = res.name; // ex.: RangeError (texto acima do limite)
        p.reject(err);
      }
    });
    port.start?.();
  }

  private send<T>(req: EngineRequestBody): { id: number; promise: Promise<T> } {
    const id = this.nextId++;
    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    });
    this.port.postMessage({ ...req, id });
    return { id, promise };
  }

  /** Converte; resolve com o resultado deste pedido. */
  convert(text: string, lang: Lang, options?: ConvertOptions): Promise<ConversionResult> {
    return this.send<ConversionResult>({ type: 'convert', text, lang, options }).promise;
  }

  /**
   * Para digitação: resolve `undefined` se outro `convertLatest` foi pedido depois deste (resposta velha
   * não sobrescreve a nova na tela).
   */
  async convertLatest(
    text: string,
    lang: Lang,
    options?: ConvertOptions,
  ): Promise<ConversionResult | undefined> {
    const { id, promise } = this.send<ConversionResult>({ type: 'convert', text, lang, options });
    this.latestId = id;
    const result = await promise;
    return id === this.latestId ? result : undefined;
  }

  /** Confere se o worker está respondendo. */
  async ping(): Promise<boolean> {
    return (await this.send<string>({ type: 'ping' }).promise) === 'pong';
  }

  /** Pedidos ainda sem resposta. */
  get inFlight(): number {
    return this.pending.size;
  }
}
