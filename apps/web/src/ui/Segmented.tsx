import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

export interface SegmentedOption<K extends string> {
  key: K;
  label: ReactNode;
}

export interface SegmentedProps<K extends string> {
  /** Nome do grupo, lido pelo leitor de tela. */
  label: string;
  options: readonly SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}

/**
 * Escolha exclusiva com visual segmentado (ex.: variante EUA / Reino Unido), no padrão WAI-ARIA de radiogroup:
 * Tab entra no grupo pela opção marcada; setas trocam a opção; Home/End vão às pontas.
 * Para trocar o conteúdo de um painel, use Tabs.
 */
export function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<K>) {
  const refs = useRef(new Map<K, HTMLButtonElement>());

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = options.findIndex((o) => o.key === value);
    const n = options.length;
    const target =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (i + 1) % n
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (i - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : -1;
    if (target < 0) return;
    e.preventDefault();
    const key = options[target]!.key;
    onChange(key);
    refs.current.get(key)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex gap-1 rounded-control bg-segment p-1', className)}
    >
      {options.map((o) => {
        const checked = o.key === value;
        return (
          <button
            key={o.key}
            ref={(el) => {
              if (el) refs.current.set(o.key, el);
              else refs.current.delete(o.key);
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.key)}
            onKeyDown={onKeyDown}
            className={cx(
              'focus-ring min-h-9 cursor-pointer rounded-[7px] px-3.5 text-sm font-semibold transition-colors',
              checked ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
