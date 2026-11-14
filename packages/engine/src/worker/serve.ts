/**
 * Lado do worker (T3.10): atende os pedidos de conversão. O motor é criado uma vez, na 1ª mensagem
 * (`getEngine` carrega manifest, léxico etc.). Uma falha na criação é reportada e tentada de novo no pedido seguinte.
 *
 * No arquivo do worker (apps/web):  serveEngine(self, async () => createEngine({ … }))
 */
import type { Engine } from '../engine';
import type { EngineRequest, EngineResponse, MessagePortLike } from './protocol';

export function serveEngine(port: MessagePortLike, getEngine: () => Promise<Engine>): void {
  let engine: Promise<Engine> | undefined;
  const ready = () => {
    engine ??= getEngine().catch((error: unknown) => {
      engine = undefined; // permite nova tentativa
      throw error;
    });
    return engine;
  };

  port.addEventListener('message', (event) => {
    const req = event.data as EngineRequest;
    const reply = (res: EngineResponse) => port.postMessage(res);
    if (req.type === 'ping') {
      reply({ id: req.id, ok: true, result: 'pong' });
      return;
    }
    ready()
      .then((e) => e.convert(req.text, req.lang, req.options))
      .then(
        (result) => reply({ id: req.id, ok: true, result }),
        (error: unknown) => {
          const err = error instanceof Error ? error : new Error(String(error));
          reply({ id: req.id, ok: false, error: err.message, name: err.name });
        },
      );
  });
  port.start?.();
}
