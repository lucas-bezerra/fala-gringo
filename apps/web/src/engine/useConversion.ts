import { EngineClient, type ConversionResult, type Lang, type MessagePortLike } from '@falagringo/engine';
import { useEffect, useState } from 'react';

let client: EngineClient | undefined;

/** Um único worker para a página inteira, criado no primeiro uso. */
function engine(): EngineClient {
  client ??= new EngineClient(
    new Worker(new URL('./engine.worker.ts', import.meta.url), {
      type: 'module',
    }) as unknown as MessagePortLike,
  );
  return client;
}

export type ConversionState =
  | { status: 'idle' }
  /** `result` = o resultado anterior, mantido na tela enquanto o novo não chega (evita piscar). */
  | { status: 'loading'; result?: ConversionResult }
  | { status: 'ready'; result: ConversionResult }
  | { status: 'error'; message: string; result?: ConversionResult };

interface Done {
  /** Idioma + texto que produziram este resultado. */
  key: string;
  result?: ConversionResult;
  error?: string;
}

/**
 * Converte `text` com espera de digitação (`delay` ms). Respostas superadas são descartadas.
 * O estado é derivado no render: "carregando" = o último resultado é de outro texto.
 */
export function useConversion(text: string, lang: Lang, delay = 250): ConversionState {
  const [done, setDone] = useState<Done | null>(null);
  const key = `${lang}\u0000${text}`;
  const empty = !text.trim();

  useEffect(() => {
    if (empty) return;
    let live = true;
    const timer = setTimeout(() => {
      engine()
        .convertLatest(text, lang)
        .then(
          (result) => {
            if (live && result) setDone({ key, result });
          },
          (error: unknown) => {
            if (!live) return;
            const message = error instanceof Error ? error.message : String(error);
            setDone((d) => ({ key, result: d?.result, error: message }));
          },
        );
    }, delay);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [text, lang, delay, key, empty]);

  if (empty) return { status: 'idle' };
  if (!done || done.key !== key) return { status: 'loading', result: done?.result };
  if (done.error) return { status: 'error', message: done.error, result: done.result };
  return { status: 'ready', result: done.result! };
}
