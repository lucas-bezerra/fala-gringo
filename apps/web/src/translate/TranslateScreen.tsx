import type { ConversionResult, Lang, UnknownToken, WordToken } from '@falagringo/engine';
import { useEffect, useState, type Ref } from 'react';
import { ROUTE_HREF } from '@/app/route';
import { shareUrl } from '@/app/share';
import { useSavedTexts } from '@/app/storage';
import { LANG_GROUPS, groupOf } from '@/engine/langs';
import { useConversion, type ConversionState } from '@/engine/useConversion';
import { BottomSheet, Button, Chip, Segmented, Tabs, useToast } from '@/ui';
import type { ReadingMode } from './Pronunciation';
import { SavedTexts } from './SavedTexts';
import { useOfflineReady } from '@/offline/useOfflineReady';
import { useMediaQuery } from './useMediaQuery';
import { useSpeech, type SpeechState } from './useSpeech';
import { WordCard } from './WordCard';
import { WordDetail } from './WordDetail';

const MAX = 2000;
/** A partir daqui o detalhe fica no painel lateral; abaixo, no painel inferior. */
const DESKTOP = '(min-width: 1024px)';

type Word = WordToken | UnknownToken;

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
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

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

const PresentIcon = () => (
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
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

export interface TranslateScreenProps {
  headingRef: Ref<HTMLHeadingElement>;
  text: string;
  setText: (t: string) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Chamado antes de ir ao modo apresentador (leva o texto como roteiro). */
  onPresent: () => void;
}

export function TranslateScreen({
  headingRef,
  text,
  setText,
  lang,
  setLang,
  onPresent,
}: TranslateScreenProps) {
  const [mode, setMode] = useState<ReadingMode>('syllabic');
  const [selected, setSelected] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const desktop = useMediaQuery(DESKTOP);
  const state = useConversion(text, lang);
  const group = groupOf(lang);
  const speech = useSpeech(lang, group.inLabel);
  const result = 'result' in state ? state.result : undefined;
  const words = (result?.tokens ?? []).filter((t): t is Word => t.kind !== 'text');
  // a seleção sobrevive à troca de texto enquanto o índice existir
  const current = words.length ? words[Math.min(selected, words.length - 1)] : undefined;
  const currentIndex = current ? words.indexOf(current) : -1;

  const offlineReady = useOfflineReady(lang);
  const toast = useToast();
  const saved = useSavedTexts();
  const isFavorite = saved.favorites.includes(text.trim());

  // vai para os recentes quando o texto fica parado 1,5 s com resultado
  const { addRecent } = saved;
  useEffect(() => {
    if (state.status !== 'ready') return;
    const timer = setTimeout(() => addRecent(text), 1500);
    return () => clearTimeout(timer);
  }, [state.status, text, addRecent]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(text, lang));
      toast.show('Link copiado. Quem abrir verá este texto.');
    } catch {
      toast.show('Não foi possível copiar o link.');
    }
  };

  const select = (i: number) => {
    setSelected(i);
    if (!desktop) setSheetOpen(true);
  };

  return (
    <div className="bg-canvas text-ink">
      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6">
        <h1 ref={headingRef} tabIndex={-1} className="sr-only">
          Como pronunciar em {group.inLabel}
        </h1>
        <section aria-label="Idioma de origem" className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <div role="group" aria-label="Idioma" className="flex flex-wrap items-center gap-2">
            {LANG_GROUPS.map((g) => (
              <Chip key={g.code} pressed={g === group} onPressedChange={() => setLang(g.variants[0]!.lang)}>
                <span className="font-mono text-xs">{g.code}</span>
                {g.label}
              </Chip>
            ))}
            <span className="text-sm text-muted">Outros idiomas em breve</span>
            {offlineReady && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-3 py-1 text-sm font-semibold text-ok">
                <span aria-hidden="true">✓</span> Disponível offline
              </span>
            )}
          </div>
          {group.variants.length > 1 && (
            <Segmented
              label="Variante"
              value={lang}
              onChange={setLang}
              options={group.variants.map((v) => ({ key: v.lang, label: v.label }))}
            />
          )}
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-5">
            <section className="rounded-card border border-line bg-surface p-4 sm:p-5">
              <label htmlFor="entrada" className="mb-1.5 block text-[13px] font-semibold text-ink-2">
                Texto em {group.inLabel}
              </label>
              <textarea
                id="entrada"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX}
                rows={3}
                spellCheck={false}
                className="focus-ring block w-full resize-y rounded-control border border-line bg-surface px-3 py-2 text-xl leading-snug text-ink focus:border-accent"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-muted">
                  {text.length.toLocaleString('pt-BR')} caracteres · máx. {MAX.toLocaleString('pt-BR')}
                </span>
                <span className="flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-pressed={isFavorite}
                    onClick={() => saved.toggleFavorite(text)}
                    disabled={!text.trim()}
                  >
                    <span aria-hidden="true">{isFavorite ? '★' : '☆'}</span>
                    Favoritar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={share} disabled={!text.trim()}>
                    Compartilhar link
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setText('')} disabled={!text}>
                    Limpar
                  </Button>
                </span>
              </div>
            </section>

            <SavedTexts
              recent={saved.recent}
              favorites={saved.favorites}
              onPick={setText}
              onClearRecent={saved.clearRecent}
            />

            <Results
              state={state}
              result={result}
              words={words}
              mode={mode}
              setMode={setMode}
              selectedIndex={desktop || sheetOpen ? currentIndex : -1}
              onSelect={select}
              speech={speech}
              onPresent={onPresent}
            />
          </div>

          {desktop && (
            <aside
              aria-labelledby={current ? 'titulo-detalhe' : undefined}
              aria-label={current ? undefined : 'Detalhes da palavra'}
              className="sticky top-4 rounded-card border border-line bg-surface p-5"
            >
              {current ? (
                <WordDetail token={current} speech={speech} />
              ) : (
                <p className="text-sm text-ink-2">Escolha uma palavra para ver os detalhes som a som.</p>
              )}
            </aside>
          )}
        </div>
      </main>

      {!desktop && current && (
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={current.original}>
          <WordDetail token={current} speech={speech} showTitle={false} />
        </BottomSheet>
      )}
    </div>
  );
}

function Results({
  state,
  result,
  words,
  mode,
  setMode,
  selectedIndex,
  onSelect,
  speech,
  onPresent,
}: {
  state: ConversionState;
  result: ConversionResult | undefined;
  words: Word[];
  mode: ReadingMode;
  setMode: (m: ReadingMode) => void;
  selectedIndex: number;
  onSelect: (i: number) => void;
  speech: SpeechState;
  onPresent: () => void;
}) {
  const toast = useToast();
  const reading = result ? (mode === 'syllabic' ? result.reading.syllabic : result.reading.flat) : '';
  const phrase = words.map((w) => w.original).join(' ');
  const hasStress = words.some((w) => w.kind === 'word' && w.primary.stress !== 'none');
  const hasSpecial = words.some(
    (w) => w.kind === 'word' && w.primary.syllables.some((s) => s.segments.some((g) => g.special)),
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reading);
      toast.show('Leitura copiada');
    } catch {
      toast.show('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  };

  const list = (m: ReadingMode) => (
    <ul aria-label="Palavras" className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
      {words.map((w, i) => (
        <WordCard
          key={`${i}-${w.original}`}
          token={w}
          mode={m}
          selected={i === selectedIndex}
          onSelect={() => onSelect(i)}
        />
      ))}
    </ul>
  );

  return (
    <section
      aria-labelledby="titulo-pronuncia"
      className="rounded-card border border-line bg-surface p-4 sm:p-5"
    >
      <h2 id="titulo-pronuncia" className="mb-3 font-display text-xl font-bold">
        Como falar
      </h2>

      <p role="status" className="sr-only">
        {state.status === 'loading' && !result ? 'Carregando o dicionário…' : ''}
      </p>
      {state.status === 'error' && (
        <p
          role="alert"
          className="mb-3 rounded-control border border-special bg-special-soft px-3 py-2 text-sm text-special-ink"
        >
          {typeof navigator !== 'undefined' && !navigator.onLine ? (
            <>
              Sem internet, e esta parte do dicionário ainda não está no aparelho. Para usar offline, baixe o
              idioma em{' '}
              <a href={ROUTE_HREF.offline} className="underline">
                Uso offline
              </a>
              .
            </>
          ) : (
            <>Não foi possível converter: {state.message}</>
          )}
        </p>
      )}

      {state.status === 'idle' && (
        <p className="text-ink-2">Digite ou cole um texto acima para ver como se fala.</p>
      )}
      {state.status === 'loading' && !result && <p className="text-ink-2">Carregando o dicionário…</p>}

      {result && words.length > 0 && (
        <div aria-busy={state.status === 'loading'}>
          <Tabs
            label="Formato"
            value={mode}
            onChange={setMode}
            actions={
              <span className="flex flex-wrap gap-2 sm:ml-auto">
                <Button
                  size="sm"
                  icon={<SpeakerIcon />}
                  disabled={!speech.available}
                  title={speech.available ? undefined : speech.reason}
                  onClick={() => speech.speak?.(phrase)}
                >
                  Ouvir frase
                </Button>
                <Button size="sm" icon={<CopyIcon />} onClick={copy}>
                  Copiar leitura
                </Button>
                <a
                  href={ROUTE_HREF.apresentar}
                  onClick={onPresent}
                  className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-control border border-line bg-surface px-3 text-sm font-semibold text-ink hover:border-line-strong hover:bg-subtle"
                >
                  <span aria-hidden="true" className="inline-flex">
                    <PresentIcon />
                  </span>
                  Apresentar
                </a>
              </span>
            }
            items={[
              { key: 'syllabic', label: 'Sílabas', panel: list('syllabic') },
              { key: 'flat', label: 'Corrido', panel: list('flat') },
            ]}
          />

          <div className="mt-4 rounded-control bg-subtle px-4 py-3">
            <p className="text-xs font-semibold text-muted">Leitura</p>
            <p className="text-2xl font-semibold break-words">{reading}</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
            {hasStress && (
              <span>
                <strong className="font-bold text-ink">MAIÚSCULAS</strong> = sílaba tônica
              </span>
            )}
            {hasSpecial && (
              <span>
                <span className="font-semibold text-special underline decoration-2 underline-offset-2">
                  sublinhado laranja
                </span>{' '}
                = som que não existe em português
              </span>
            )}
            <span>Toque numa palavra para ver o som a som</span>
          </div>
        </div>
      )}
      {result && words.length === 0 && <p className="text-ink-2">Nenhuma palavra para converter.</p>}

      <p className="mt-4 text-xs text-muted">
        Aproximação para leitura, gerada automaticamente. O áudio é a voz sintética do navegador. Confirme a
        pronúncia antes de usar no ar.
      </p>
    </section>
  );
}
