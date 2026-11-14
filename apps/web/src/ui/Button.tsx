import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'border border-line bg-surface text-ink hover:border-line-strong hover:bg-subtle',
  ghost: 'bg-transparent text-ink-2 hover:bg-segment',
};

type Common = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: ButtonVariant;
  /** `md` = 44 px (alvo de toque mínimo); `sm` = 36 px, só em barras densas no desktop. */
  size?: 'md' | 'sm';
  icon?: ReactNode;
  /** React 19: ref é prop comum (o Popover usa para posicionar). */
  ref?: Ref<HTMLButtonElement>;
};

/**
 * Botão. Um botão só com ícone exige `aria-label` (o tipo obriga): sem texto, o leitor de tela não teria o que ler.
 */
export type ButtonProps = Common & ({ children: ReactNode } | { children?: undefined; 'aria-label': string });

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cx(
        'focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'min-h-11 px-4' : 'min-h-9 px-3 text-sm',
        !children && (size === 'md' ? 'w-11 px-0' : 'w-9 px-0'),
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon && (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
