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

/**
 * Cria o worker e já carrega o motor (manifest), em paralelo com o primeiro render do React.
 * Um texto só com espaço não consulta o dicionário: não baixa shard nenhum.
 */
export function warmUpEngine(lang: Lang): void {
  engine()
    .convert(' ', lang)
    .catch(() => {});
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
export function useConversion(
  text: string,
  lang: Lang,
  options: { mixed?: boolean; delay?: number } = {},
): ConversionState {
  const { mixed = false, delay = 250 } = options;
  const [done, setDone] = useState<Done | null>(null);
  const key = `${lang}\u0000${mixed ? 'm' : ''}\u0000${text}`;
  const empty = !text.trim();
  const wait = done ? delay : 0;

  useEffect(() => {
    if (empty) return;
    let live = true;
    // a 1ª conversão sai sem a espera de digitação (o texto inicial já está pronto)
    const timer = setTimeout(() => {
      engine()
        .convertLatest(text, lang, { mixed })
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
    }, wait);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [text, lang, mixed, wait, key, empty]);

  if (empty) return { status: 'idle' };
  if (!done || done.key !== key) return { status: 'loading', result: done?.result };
  if (done.error) return { status: 'error', message: done.error, result: done.result };
  return { status: 'ready', result: done.result! };
}
