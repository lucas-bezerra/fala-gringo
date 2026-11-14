import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';

export interface TabItem<K extends string> {
  key: K;
  label: ReactNode;
  panel: ReactNode;
}

export interface TabsProps<K extends string> {
  /** Nome do grupo, lido pelo leitor de tela. */
  label: string;
  items: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Botões ao lado das abas (ex.: Copiar). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Abas no padrão WAI-ARIA (tablist/tab/tabpanel), com visual de controle segmentado.
 * Teclado: setas ←/→ trocam e ativam a aba; Home/End vão à primeira/última; Tab entra no painel.
 */
export function Tabs<K extends string>({ label, items, value, onChange, actions, className }: TabsProps<K>) {
  const id = useId();
  const refs = useRef(new Map<K, HTMLButtonElement>());

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = items.findIndex((t) => t.key === value);
    const target =
      e.key === 'ArrowRight'
        ? (i + 1) % items.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + items.length) % items.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? items.length - 1
              : -1;
    if (target < 0) return;
    e.preventDefault();
    const key = items[target]!.key;
    onChange(key);
    refs.current.get(key)?.focus();
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded-control bg-segment p-1">
          {items.map((t) => {
            const selected = t.key === value;
            return (
              <button
                key={t.key}
                ref={(el) => {
                  if (el) refs.current.set(t.key, el);
                  else refs.current.delete(t.key);
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${t.key}`}
                aria-selected={selected}
                aria-controls={`${id}-panel-${t.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onChange(t.key)}
                onKeyDown={onKeyDown}
                className={cx(
                  'focus-ring min-h-9 cursor-pointer rounded-[7px] px-3.5 text-sm font-semibold transition-colors',
                  selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        {actions}
      </div>
      {items.map((t) => (
        <div
          key={t.key}
          role="tabpanel"
          id={`${id}-panel-${t.key}`}
          aria-labelledby={`${id}-tab-${t.key}`}
          hidden={t.key !== value}
          tabIndex={0}
          className="focus-ring mt-3 rounded-control"
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
