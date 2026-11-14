import type { Lang, Pronunciation, Token } from '@falagringo/engine';
import { useEffect, useId, useState, type Ref } from 'react';
import { ROUTE_HREF } from '@/app/route';
import { groupOf } from '@/engine/langs';
import { useConversion } from '@/engine/useConversion';
import { cx } from '@/ui';

/** Tamanhos do texto (px). O padrão (64) é legível a ~3 m num monitor de 24" ou maior. */
export const SIZES = [40, 52, 64, 80, 96] as const;
const DEFAULT_SIZE = 2;

/** Atalhos (mostrados na tela; também valem como documentação). Ignorados enquanto se digita no roteiro. */
export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Espaço / Shift+Espaço', action: 'rola o texto para baixo / para cima' },
  { keys: '+ / −', action: 'aumenta / diminui o texto' },
  { keys: 'I', action: 'mostra / esconde o IPA' },
  { keys: 'E', action: 'abre / fecha a edição do roteiro' },
];

function readingOf(p: Pronunciation): string {
  return p.syllables.map((s, i) => (i === 0 ? '' : s.wordStart ? ' ' : '·') + s.text).join('');
}

/** Quebra os tokens em parágrafos nas linhas em branco (ou em qualquer quebra de linha). */
function paragraphs(tokens: Token[]): Token[][] {
  const out: Token[][] = [[]];
  for (const t of tokens) {
    if (t.kind === 'text' && t.reason === 'space' && t.text.includes('\n')) out.push([]);
    else out[out.length - 1]!.push(t);
  }
  return out.filter((p) => p.some((t) => t.kind !== 'text' || t.text.trim()));
}

const BarButton =
  'focus-ring cursor-pointer rounded-[7px] bg-stage-line font-bold text-white hover:bg-[#334155]';

export interface PresenterScreenProps {
  headingRef: Ref<HTMLHeadingElement>;
  script: string;
  setScript: (s: string) => void;
  lang: Lang;
}

export function PresenterScreen({ headingRef, script, setScript, lang }: PresenterScreenProps) {
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [ipa, setIpa] = useState(false);
  const [editing, setEditing] = useState(!script.trim());
  const state = useConversion(script, lang, { mixed: true });
  const result = 'result' in state ? state.result : undefined;
  const group = groupOf(lang);
  const variant = group.variants.find((v) => v.lang === lang)?.label;
  const editorId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        el?.closest('textarea, input, select, [contenteditable="true"]')
      )
        return;
      const smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      if (e.key === ' ' && !el?.closest('button, a')) {
        e.preventDefault();
        window.scrollBy({ top: (e.shiftKey ? -1 : 1) * window.innerHeight * 0.6, behavior: smooth });
      } else if (e.key === '+' || e.key === '=') {
        setSize((s) => Math.min(SIZES.length - 1, s + 1));
      } else if (e.key === '-' || e.key === '−') {
        setSize((s) => Math.max(0, s - 1));
      } else if (e.key === 'i' || e.key === 'I') {
        setIpa((v) => !v);
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault(); // não digita "e" no roteiro ao abrir
        setEditing((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const paras = result ? paragraphs(result.tokens) : [];
  const withVariants = (result?.tokens ?? []).filter((t) => t.kind === 'word' && t.variants.length > 0);
  const unknown = (result?.tokens ?? []).some((t) => t.kind === 'unknown');

  return (
    <div className="min-h-screen bg-stage text-white">
      <div className="border-b border-stage-line">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a
            href={ROUTE_HREF.traduzir}
            className="focus-ring flex min-h-11 items-center gap-2 rounded-control font-semibold text-slate-200"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Sair do modo apresentador
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-300">
              {group.label}
              {variant && ` (${variant})`}
            </span>
            <button
              type="button"
              aria-expanded={editing}
              aria-controls={editorId}
              onClick={() => setEditing((v) => !v)}
              className="focus-ring min-h-11 cursor-pointer rounded-control border border-slate-600 px-3.5 font-semibold text-white hover:bg-stage-2"
            >
              {editing ? 'Fechar roteiro' : 'Editar roteiro'}
            </button>
            <div
              role="group"
              aria-label="Tamanho do texto"
              className="flex gap-1 rounded-control bg-stage-2 p-1"
            >
              <button
                type="button"
                aria-label="A− (diminuir texto)"
                disabled={size === 0}
                onClick={() => setSize((s) => Math.max(0, s - 1))}
                className={cx(BarButton, 'h-10 w-11 disabled:opacity-40')}
              >
                A−
              </button>
              <span
                aria-live="polite"
                className="flex min-w-14 items-center justify-center font-mono text-[13px] text-slate-300"
              >
                {SIZES[size]} px
              </span>
              <button
                type="button"
                aria-label="A+ (aumentar texto)"
                disabled={size === SIZES.length - 1}
                onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}
                className={cx(BarButton, 'h-10 w-11 disabled:opacity-40')}
              >
                A+
              </button>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ipa}
              onClick={() => setIpa((v) => !v)}
              className="focus-ring flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control border border-slate-600 px-3.5 font-semibold text-white"
            >
              <span
                aria-hidden="true"
                className={cx('relative h-5 w-9 rounded-full', ipa ? 'bg-blue-500' : 'bg-slate-600')}
              >
                <span
                  className={cx(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
                    ipa ? 'left-[18px]' : 'left-0.5',
                  )}
                />
              </span>
              Mostrar IPA
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-[1320px] flex-col gap-12 px-4 pt-10 pb-8 sm:px-6">
        <h1 ref={headingRef} tabIndex={-1} className="sr-only">
          Modo apresentador
        </h1>

        <div id={editorId} hidden={!editing}>
          <label htmlFor={`${editorId}-texto`} className="mb-1.5 block text-sm font-semibold text-slate-300">
            Roteiro (português com nomes e palavras estrangeiras)
          </label>
          <textarea
            id={`${editorId}-texto`}
            value={script}
            onChange={(e) => setScript(e.target.value)}
            maxLength={2000}
            rows={5}
            spellCheck={false}
            className="focus-ring block w-full resize-y rounded-control border border-slate-600 bg-stage-2 px-3 py-2 text-lg text-white"
          />
          <p className="mt-1 text-xs text-slate-400">
            {script.length.toLocaleString('pt-BR')} caracteres · máx. 2.000. Linha em branco separa
            parágrafos.
          </p>
        </div>

        <p role="status" className="sr-only">
          {state.status === 'loading' && !result ? 'Preparando o roteiro…' : ''}
        </p>
        {state.status === 'error' && (
          <p role="alert" className="rounded-control border border-stage-mark px-3 py-2 text-stage-mark">
            Não foi possível converter: {state.message}
          </p>
        )}
        {!script.trim() && <p className="text-xl text-slate-300">Escreva o roteiro para começar.</p>}

        <div
          aria-busy={state.status === 'loading'}
          className="flex flex-col gap-14"
          style={{ fontSize: SIZES[size] }}
        >
          {paras.map((tokens, i) => (
            <p key={i} className="leading-[1.15] font-medium text-slate-300">
              {tokens.map((t, j) => (
                <PresenterToken key={j} token={t} showIpa={ipa} />
              ))}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-7 gap-y-3 border-t border-stage-line pt-5 text-[15px] text-slate-300">
          <span>
            <span className="font-bold text-stage-reading">Amarelo</span>: como falar (tônica em MAIÚSCULAS)
          </span>
          <span>
            <span className="border-b-[3px] border-stage-mark font-semibold text-white">Sublinhado</span>:
            palavra estrangeira detectada
          </span>
          {unknown && <span>“?”: fora do dicionário, confirme a pronúncia</span>}
          {withVariants.length > 0 && (
            <span>
              Mais de uma pronúncia aceita:{' '}
              {[...new Set(withVariants.map((t) => (t.kind === 'word' ? t.original : '')))].join(', ')}.
              Confirme qual usar.
            </span>
          )}
        </div>

        <section aria-labelledby="titulo-atalhos" className="text-sm text-slate-400">
          <h2 id="titulo-atalhos" className="mb-1 font-semibold text-slate-300">
            Atalhos de teclado
          </h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-1">
            {SHORTCUTS.map((s) => (
              <li key={s.keys}>
                <kbd className="font-mono text-slate-200">{s.keys}</kbd>: {s.action}
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Aproximações para leitura, geradas automaticamente: confirme a pronúncia antes de ir ao ar.
            Palavras em português são detectadas por um léxico e podem falhar em casos raros.
          </p>
        </section>
      </main>
    </div>
  );
}

/** Palavra estrangeira: leitura em amarelo acima, IPA opcional, original sublinhado. O resto passa como texto. */
function PresenterToken({ token, showIpa }: { token: Token; showIpa: boolean }) {
  if (token.kind === 'text') return <>{token.text}</>;
  const reading = token.kind === 'word' ? readingOf(token.primary) : '?';
  return (
    <span className="inline-flex flex-col items-start align-bottom">
      <span
        className={cx(
          'text-[0.62em] font-bold',
          token.kind === 'word' ? 'text-stage-reading' : 'text-slate-400',
        )}
      >
        {reading}
      </span>
      {showIpa && token.kind === 'word' && (
        <span className="font-ipa text-[0.34em] text-slate-400">/{token.primary.ipa}/</span>
      )}
      <span
        className={cx(
          'border-b-[3px] font-semibold text-white',
          token.kind === 'word' ? 'border-stage-mark' : 'border-dashed border-slate-400',
        )}
      >
        {token.original}
      </span>
    </span>
  );
}
