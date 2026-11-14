import { useState, type ReactNode } from 'react';
import { BottomSheet, Button, Chip, Popover, Tabs, ToastProvider, useToast } from '@/ui';

/** Catálogo interno dos componentes base (T4.1): cada um com seus estados, para conferir visual e teclado. */
export function Catalog() {
  return (
    <ToastProvider>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <header>
          <h1 className="font-display text-3xl font-bold">Componentes base</h1>
          <p className="mt-1 text-ink-2">
            Catálogo interno do FalaGringo. Tudo funciona por teclado: Tab, Enter, Espaço, setas e Esc.
          </p>
        </header>
        <Buttons />
        <Chips />
        <TabsDemo />
        <PopoverDemo />
        <SheetDemo />
        <ToastDemo />
      </main>
    </ToastProvider>
  );
}

function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section aria-labelledby={`sec-${title}`} className="rounded-card border border-line bg-surface p-5">
      <h2 id={`sec-${title}`} className="font-display text-xl font-bold">
        {title}
      </h2>
      {note && <p className="mt-1 text-sm text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const SpeakerIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
  </svg>
);

const CopyIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

function Buttons() {
  return (
    <Section
      title="Botão"
      note="Primário, secundário e discreto; 44 px de altura (alvo de toque). Só ícone exige aria-label."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" icon={<SpeakerIcon />}>
          Ouvir (voz sintética)
        </Button>
        <Button icon={<CopyIcon />}>Copiar</Button>
        <Button variant="ghost">Limpar</Button>
        <Button aria-label="Copiar o texto" icon={<CopyIcon />} />
        <Button size="sm">Compacto</Button>
        <Button variant="primary" disabled>
          Desativado
        </Button>
      </div>
    </Section>
  );
}

const LANGS = [
  { code: 'EN', label: 'Inglês (EUA)' },
  { code: 'EN', label: 'Inglês (Reino Unido)' },
  { code: 'ES', label: 'Espanhol' },
  { code: 'FR', label: 'Francês' },
];

function Chips() {
  const [lang, setLang] = useState(0);
  const [onlySpecial, setOnlySpecial] = useState(false);
  return (
    <Section
      title="Chip"
      note="Alternância com aria-pressed. Use em grupo (role=group) para escolhas exclusivas."
    >
      <div role="group" aria-label="Idioma" className="flex flex-wrap gap-2">
        {LANGS.map((l, i) => (
          <Chip key={l.label} pressed={i === lang} onPressedChange={() => setLang(i)}>
            <span className="font-mono text-xs">{l.code}</span> {l.label}
          </Chip>
        ))}
      </div>
      <div className="mt-3">
        <Chip pressed={onlySpecial} onPressedChange={setOnlySpecial}>
          Só sons especiais
        </Chip>
      </div>
    </Section>
  );
}

function TabsDemo() {
  const [tab, setTab] = useState<'silabas' | 'corrida'>('silabas');
  return (
    <Section title="Abas" note="Setas ← → trocam a aba; Home e End vão às pontas; Tab entra no painel.">
      <Tabs
        label="Formato da leitura"
        value={tab}
        onChange={setTab}
        items={[
          {
            key: 'silabas',
            label: 'Sílabas',
            panel: <p className="text-2xl font-semibold">UÉL·kâm</p>,
          },
          {
            key: 'corrida',
            label: 'Corrida',
            panel: <p className="text-2xl font-semibold">uélkâm</p>,
          },
        ]}
      />
    </Section>
  );
}

function PopoverDemo() {
  return (
    <Section title="Popover" note="Esc ou clique fora fecham; o foco volta ao botão.">
      <Popover
        label="O que é o som th"
        trigger={(p) => (
          <Button {...p} variant="secondary">
            O que é “th”?
          </Button>
        )}
      >
        <p className="font-semibold">Som que não existe em português</p>
        <p className="mt-1 text-sm text-ink-2">
          Ponta da língua entre os dentes, soprando o ar. Na grafia, aparece destacado em{' '}
          <span className="font-bold text-special underline decoration-[3px] underline-offset-4">
            laranja
          </span>
          .
        </p>
      </Popover>
    </Section>
  );
}

function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Section
      title="Painel inferior"
      note="Modal: a página atrás fica inerte, Esc fecha e o foco volta ao botão."
    >
      <Button variant="primary" onClick={() => setOpen(true)}>
        Ver detalhes de “welcome”
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="welcome">
        <p className="mt-1 text-3xl font-bold">
          <span className="text-special underline decoration-[3px] underline-offset-4">UÉL</span>
          <span className="px-0.5 text-separator">·</span>kâm
        </p>
        <p className="mt-0.5 font-ipa text-sm text-muted">/ˈwɛlkəm/</p>
        <Button variant="primary" icon={<SpeakerIcon />} className="mt-3 w-full">
          Ouvir (voz sintética)
        </Button>
        <h3 className="mt-4 mb-2 text-sm font-bold text-ink-2">Som a som</h3>
        <ol className="flex flex-col gap-1.5">
          <li className="grid grid-cols-[40px_36px_1fr] gap-2 rounded-control bg-subtle px-2.5 py-2">
            <span className="font-ipa">w</span>
            <span className="font-bold">u</span>
            <span className="text-sm text-ink-2">Como o “u” de “quase”.</span>
          </li>
          <li className="grid grid-cols-[40px_36px_1fr] gap-2 rounded-control bg-special-soft px-2.5 py-2">
            <span className="font-ipa">l</span>
            <span className="font-bold text-special">l</span>
            <span className="text-sm text-ink-2">L com a língua no céu da boca. Não vira “u”.</span>
          </li>
        </ol>
      </BottomSheet>
    </Section>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <Section
      title="Aviso temporário"
      note="Anunciado pelo leitor de tela (aria-live) sem roubar o foco; some em 4 s."
    >
      <Button icon={<CopyIcon />} onClick={() => toast.show('Leitura copiada')}>
        Copiar a leitura
      </Button>
    </Section>
  );
}
