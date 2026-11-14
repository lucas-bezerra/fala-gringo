import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { cx } from './cx';

export interface PopoverTriggerProps {
  ref: Ref<HTMLButtonElement>;
  popoverTarget: string;
  'aria-expanded': boolean;
  'aria-controls': string;
}

export interface PopoverProps {
  /** Renderiza o botão que abre o popover; espalhe as props recebidas nele. */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /** Nome do popover para o leitor de tela. */
  label: string;
  children: ReactNode;
  className?: string;
}

const GAP = 8;
const MARGIN = 8;

/**
 * Popover sobre a Popover API nativa (`popover="auto"`): camada superior, Esc e clique fora fecham,
 * o foco volta ao botão. Sem bibliotecas e sem `<style>` injetado (a CSP bloquearia).
 * A posição (abaixo do botão; acima, se não couber) é aplicada via CSSOM, que a CSP permite.
 */
export function Popover({ trigger, label, children, className }: PopoverProps) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const place = useCallback(() => {
    const t = triggerRef.current?.getBoundingClientRect();
    const p = panelRef.current;
    if (!t || !p) return;
    const { width, height } = p.getBoundingClientRect();
    const below = t.bottom + GAP;
    const top =
      below + height > window.innerHeight - MARGIN && t.top - GAP - height > MARGIN
        ? t.top - GAP - height
        : below;
    const left = Math.min(Math.max(MARGIN, t.left), window.innerWidth - width - MARGIN);
    p.style.top = `${Math.round(top)}px`;
    p.style.left = `${Math.round(left)}px`;
  }, []);

  useEffect(() => {
    const p = panelRef.current;
    if (!p) return;
    const onToggle = (e: Event) => {
      const isOpen = (e as ToggleEvent).newState === 'open';
      if (isOpen) place(); // posiciona já no evento, antes de o efeito rodar
      setOpen(isOpen);
    };
    p.addEventListener('toggle', onToggle);
    return () => p.removeEventListener('toggle', onToggle);
  }, [place]);

  useEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  return (
    <>
      {trigger({ ref: triggerRef, popoverTarget: id, 'aria-expanded': open, 'aria-controls': id })}
      <div
        ref={panelRef}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label}
        className={cx(
          'fixed inset-auto m-0 max-w-[min(22rem,calc(100vw-1rem))] rounded-control border border-line bg-surface p-4 text-ink shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
