import { cx } from '@/ui';
import { ROUTE_HREF, type Route } from './route';

const NAV: { route: Route; label: string }[] = [
  { route: 'traduzir', label: 'Traduzir' },
  { route: 'apresentar', label: 'Modo apresentador' },
];

/** Cabeçalho das telas claras: marca e navegação principal. */
export function AppHeader({ route }: { route: Route }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
        <a href={ROUTE_HREF.traduzir} className="focus-ring flex min-h-11 items-center gap-2 rounded-control">
          <span
            aria-hidden="true"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-accent font-display text-[15px] font-bold text-white"
          >
            Fg
          </span>
          <span className="font-display text-lg font-bold">FalaGringo</span>
        </a>
        <nav aria-label="Principal" className="flex gap-1">
          {NAV.map((n) => (
            <a
              key={n.route}
              href={ROUTE_HREF[n.route]}
              aria-current={n.route === route ? 'page' : undefined}
              className={cx(
                'focus-ring flex min-h-11 items-center rounded-control px-3 text-sm font-semibold',
                n.route === route ? 'bg-accent-soft text-accent-strong' : 'text-ink-2 hover:bg-segment',
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
