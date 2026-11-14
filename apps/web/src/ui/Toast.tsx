import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  action?: ToastAction;
}

interface ToastApi {
  /** Mostra um aviso curto ("Copiado"). Some em `duration` ms (padrão 4 s) ou no botão fechar. */
  show: (message: string, duration?: number, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return api;
}

/**
 * Avisos temporários. A região `role="status"` (aria-live polite) fica sempre montada, para o leitor de tela
 * anunciar cada aviso sem roubar o foco. Use só para confirmações não essenciais: o aviso some sozinho.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, duration = 4000, action?: ToastAction) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { id, message, action }]); // no máximo 3 na tela
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="toast pointer-events-auto flex min-h-11 items-center gap-3 rounded-control bg-stage py-1 ring-1 ring-white/15 pr-1 pl-4 text-sm font-semibold text-white shadow-lg"
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  dismiss(t.id);
                  t.action!.onClick();
                }}
                className="focus-ring min-h-9 cursor-pointer rounded-[8px] px-2 font-bold text-[#93c5fd] underline hover:bg-white/10"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fechar aviso"
              className="focus-ring flex h-9 w-9 cursor-pointer items-center justify-center rounded-[8px] text-white/80 hover:bg-white/10 hover:text-white"
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
