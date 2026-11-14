import { SOURCES } from '@falagringo/data/sources';
import type { Ref } from 'react';

/** Fontes e créditos (T4.12): gerada do registro de fontes (packages/data/src/sources.ts, espelho do SOURCES.md). */
export function CreditsScreen({ headingRef }: { headingRef: Ref<HTMLHeadingElement> }) {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="outline-none mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6"
    >
      <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-bold">
        Fontes e créditos
      </h1>
      <p className="text-ink-2">
        O FalaGringo usa apenas dados abertos, com licenças que permitem este uso. As aproximações em
        português são geradas automaticamente a partir do IPA dessas fontes; erros são do FalaGringo, não
        delas.
      </p>
      <ul className="flex flex-col gap-3">
        {Object.entries(SOURCES).map(([id, s]) => (
          <li key={id} className="rounded-card border border-line bg-surface p-4">
            <h2 className="font-display text-lg font-bold">
              <a href={s.url} className="focus-ring rounded underline" rel="noopener noreferrer">
                {s.name}
              </a>
            </h2>
            <p className="mt-1 text-sm">
              <span className="font-semibold">Licença:</span> {s.license}
              {s.shareAlike && ' · compartilhamento pela mesma licença'}
            </p>
            <p className="mt-1 text-sm text-ink-2">{s.credit}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-ink-2">
        Interface, código e regras de conversão: FalaGringo. Fontes tipográficas: Inter, Space Grotesk e Noto
        Sans Mono (SIL Open Font License), servidas pelo próprio site. A voz do botão “Ouvir” é a voz
        sintética do seu navegador.
      </p>
    </main>
  );
}
