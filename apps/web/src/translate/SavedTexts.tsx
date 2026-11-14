import { Button } from '@/ui';

/** Recentes e favoritos (T4.9): clicar carrega o texto. Tudo fica só neste navegador. */
export function SavedTexts({
  recent,
  favorites,
  onPick,
  onClearRecent,
}: {
  recent: string[];
  favorites: string[];
  onPick: (t: string) => void;
  onClearRecent: () => void;
}) {
  if (!recent.length && !favorites.length) return null;
  const item = (t: string) => (
    <li key={t}>
      <button
        type="button"
        onClick={() => onPick(t)}
        title={t}
        className="focus-ring min-h-9 max-w-[18rem] cursor-pointer truncate rounded-full border border-line bg-surface px-3 text-sm text-ink-2 hover:border-line-strong"
      >
        {t}
      </button>
    </li>
  );
  return (
    <section aria-label="Textos salvos" className="flex flex-col gap-2 text-sm">
      {favorites.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-semibold text-muted">Favoritos</h2>
          <ul className="flex flex-wrap gap-2">{favorites.map(item)}</ul>
        </div>
      )}
      {recent.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xs font-semibold text-muted">Recentes</h2>
          <ul className="flex flex-wrap gap-2">{recent.map(item)}</ul>
          <Button variant="ghost" size="sm" onClick={onClearRecent}>
            Limpar recentes
          </Button>
        </div>
      )}
    </section>
  );
}
