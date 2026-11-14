import type { Pronunciation as P, Syllable } from '@falagringo/engine';
import { Fragment } from 'react';
import { cx } from '@/ui';

export type ReadingMode = 'syllabic' | 'flat';

const SPECIAL = 'text-special underline decoration-[3px] underline-offset-4';

/** Pedaços da sílaba com o destaque laranja só no som especial (notação, seção 5.1). */
function SyllableText({ s }: { s: Syllable }) {
  const pieces = s.segments.map((g) => ({
    text: s.stressed ? g.text.toLocaleUpperCase('pt-BR') : g.text,
    special: g.special,
  }));
  // Garantia: se os pedaços não remontam a sílaba (caso inesperado), mostra a sílaba sem destaque.
  if (pieces.map((p) => p.text).join('') !== s.text) return <>{s.text}</>;
  return (
    <>
      {pieces.map((p, i) =>
        p.special ? (
          <span key={i} className={SPECIAL}>
            {p.text}
          </span>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * Versão falada para o leitor de tela (T4.11): minúsculas (MAIÚSCULAS podem ser soletradas) e a tônica dita
 * por extenso. Ex.: "uátching, tônica em uá".
 */
export function spokenReading(p: P): string {
  const lower = (t: string) => t.toLocaleLowerCase('pt-BR');
  const words = p.syllables.map((s, i) => (i > 0 && s.wordStart ? ' ' : '') + lower(s.text)).join('');
  const stressed = p.syllables.filter((s) => s.stressed);
  return p.syllables.length > 1 && stressed.length
    ? `${words}, tônica em ${stressed.map((s) => lower(s.text)).join(' e ')}`
    : words;
}

/**
 * Grafia PT-BR de uma pronúncia. Tônica em negrito (e MAIÚSCULAS, que já vêm do motor); átonas mais leves.
 * O visual é escondido do leitor de tela, que lê a versão falada (spokenReading).
 */
export function PronunciationText({ p, mode, className }: { p: P; mode: ReadingMode; className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">{spokenReading(p)}</span>
      <span aria-hidden="true">
        {p.syllables.map((s, i) => (
          <Fragment key={i}>
            {i > 0 && s.wordStart && ' '}
            {i > 0 && !s.wordStart && mode === 'syllabic' && (
              <span aria-hidden="true" className="px-0.5 font-normal text-separator">
                ·
              </span>
            )}
            <span className={cx(s.stressed ? 'font-bold' : 'font-medium text-ink-2')}>
              <SyllableText s={s} />
            </span>
          </Fragment>
        ))}
      </span>
    </span>
  );
}
