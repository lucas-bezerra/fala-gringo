import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cx } from './cx';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * Painel inferior modal sobre `<dialog>` nativo (`showModal`): o foco vai para dentro, o resto da página fica
 * inerte (o Tab só percorre o painel e a interface do navegador), Esc fecha e o foco volta a quem abriu.
 * Clique no fundo escurecido também fecha.
 * No celular ocupa a largura toda; a partir de `sm`, fica centralizado com largura máxima.
 */
export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        // o próprio <dialog> só recebe o clique quando ele cai no fundo (fora do conteúdo)
        if (e.target === e.currentTarget) onClose();
      }}
      className={cx(
        'sheet mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-full overflow-hidden rounded-t-[20px] bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/45 sm:max-w-xl',
        className,
      )}
    >
      <div className="max-h-[85dvh] overflow-y-auto px-[18px] pt-2.5 pb-6">
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded bg-separator/60" />
        <div className="flex items-start justify-between gap-2.5">
          <h2 id={titleId} className="font-display text-[22px] font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="focus-ring flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control bg-segment text-ink"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
