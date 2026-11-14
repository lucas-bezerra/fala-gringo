import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  /** Ligado/desligado (aria-pressed). */
  pressed: boolean;
  onPressedChange?: (pressed: boolean) => void;
  children: ReactNode;
};

/** Chip de alternância (filtros, escolha de idioma). Anuncia o estado com aria-pressed. */
export function Chip({ pressed, onPressedChange, className, children, onClick, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) onPressedChange?.(!pressed);
      }}
      className={cx(
        'focus-ring inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 font-semibold transition-colors',
        pressed
          ? 'border-accent bg-accent text-white'
          : 'border-line-strong bg-surface text-ink hover:bg-subtle',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
