/**
 * Protocolo entre a tela e o motor rodando num Web Worker (T3.10). Puro: a "porta" é qualquer objeto com
 * `postMessage` e `addEventListener('message')` — o próprio Worker no navegador, um MessageChannel nos testes.
 */
import type { ConversionResult, ConvertOptions, Lang } from '../types';

export type EngineRequest =
  | { id: number; type: 'convert'; text: string; lang: Lang; options?: ConvertOptions }
  | { id: number; type: 'ping' };

/** Pedido sem o `id` (o cliente numera). Distributivo: preserva cada variante da união. */
export type EngineRequestBody = EngineRequest extends infer R
  ? R extends EngineRequest
    ? Omit<R, 'id'>
    : never
  : never;

export type EngineResponse =
  | { id: number; ok: true; result: ConversionResult | 'pong' }
  | { id: number; ok: false; error: string; name: string };

export interface MessagePortLike {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void;
  /** MessagePort precisa de start() para entregar mensagens via addEventListener. */
  start?(): void;
}
