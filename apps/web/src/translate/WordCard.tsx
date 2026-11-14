import type { UnknownToken, WordToken } from '@falagringo/engine';
import { cx } from '@/ui';
import { PronunciationText, type ReadingMode } from './Pronunciation';

const BADGE =
  'rounded-full border border-dashed border-muted px-2 py-px text-[11px] font-semibold text-ink-2';

/** Cartão de uma palavra: original, grafia PT-BR e IPA. Clicar abre o detalhe (painel lateral ou inferior). */
export function WordCard({
  token,
  mode,
  selected,
  onSelect,
}: {
  token: WordToken | UnknownToken;
  mode: ReadingMode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="flex">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cx(
          'focus-ring flex w-full min-w-[120px] cursor-pointer flex-col items-start gap-1.5 rounded-card border-2 px-4 py-3.5 text-left transition-colors',
          selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
          token.kind === 'unknown' && !selected && 'border-dashed border-line-strong',
        )}
      >
        <span className="flex items-center gap-2 text-sm text-muted">
          {token.original}
          {token.kind === 'word' && token.origin === 'estimated' && <span className={BADGE}>estimado</span>}
        </span>
        {token.kind === 'word' ? (
          <>
            <PronunciationText p={token.primary} mode={mode} className="text-[26px] leading-tight" />
            <span className="font-ipa text-xs text-muted">/{token.primary.ipa}/</span>
          </>
        ) : (
          <>
            <span className="text-[15px] font-semibold text-ink-2">Fora do dicionário</span>
            <span className="text-xs text-muted">Ainda sem estimativa para esta palavra.</span>
          </>
        )}
      </button>
    </li>
  );
}
