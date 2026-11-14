import { ROUTE_HREF } from './route';

/** Crédito dos dados em todas as telas (exigência do CC BY-SA e da EDRDG). */
export function AppFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer
      className={dark ? 'border-t border-stage-line text-slate-400' : 'border-t border-line text-muted'}
    >
      <p className="mx-auto max-w-6xl px-4 py-4 text-xs sm:px-6">
        Pronúncias a partir de CMUdict, Britfone, Wiktionary (CC BY-SA 4.0) e outras fontes abertas.{' '}
        <a
          href={ROUTE_HREF.creditos}
          className={
            dark ? 'focus-ring rounded underline text-slate-200' : 'focus-ring rounded underline text-ink-2'
          }
        >
          Fontes e créditos
        </a>
      </p>
    </footer>
  );
}
