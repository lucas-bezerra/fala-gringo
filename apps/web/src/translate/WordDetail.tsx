import { SOURCES } from '@falagringo/data/sources';
import type { Lang, Pronunciation, UnknownToken, WordToken } from '@falagringo/engine';
import { useId } from 'react';
import { Button, cx } from '@/ui';
import { PronunciationText } from './Pronunciation';
import type { SpeechState } from './useSpeech';

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

const NOTE =
  'mt-3 rounded-control border border-dashed border-muted bg-subtle px-3 py-2.5 text-[13px] text-ink-2';

/**
 * Botão de áudio com a legenda "voz sintética do navegador" sempre visível (e lida junto, via aria-describedby).
 * Sem voz disponível, o botão fica desativado e a legenda passa a dizer o motivo.
 */
export function SpeakButton({
  text,
  speech,
  className,
}: {
  text: string;
  speech: SpeechState;
  className?: string;
}) {
  const captionId = useId();
  return (
    <div className={className}>
      <Button
        variant="primary"
        icon={<SpeakerIcon />}
        className="w-full"
        disabled={!speech.available}
        aria-describedby={captionId}
        onClick={() => speech.speak?.(text)}
      >
        Ouvir a palavra
      </Button>
      <p id={captionId} className="mt-1.5 text-center text-xs text-muted">
        {speech.available ? 'Voz sintética do navegador' : speech.reason}
      </p>
    </div>
  );
}

function stressNote(p: Pronunciation): string | undefined {
  if (p.stress === 'borrowed') return 'Tônica emprestada da outra variante do idioma: confira.';
  if (p.stress === 'rule') return 'A fonte não marca a tônica; ela foi definida pela regra do idioma.';
  return undefined;
}

/** Som a som: cada pedaço da grafia ligado ao som de origem (IPA). */
function SoundBySound({ p }: { p: Pronunciation }) {
  const rows = p.syllables.flatMap((s) => s.segments).filter((g) => g.ipa || g.text);
  return (
    <ol className="flex flex-col gap-1.5">
      {rows.map((g, i) => (
        <li
          key={i}
          className={cx(
            'grid grid-cols-[48px_44px_minmax(0,1fr)] items-baseline gap-2 rounded-control px-2.5 py-2',
            g.special ? 'bg-special-soft' : 'bg-subtle',
          )}
        >
          <span className="font-ipa text-base" aria-label={`som ${g.ipa}`}>
            {g.ipa || '—'}
          </span>
          <span className={cx('font-bold', g.special && 'text-special-ink')}>{g.text || '(mudo)'}</span>
          <span className="text-[13px] text-ink-2">
            {g.special ? 'Som que não existe em português.' : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

export interface WordDetailProps {
  token: WordToken | UnknownToken;
  lang: Lang;
  speech: SpeechState;
  /** No painel lateral o título é a palavra; no painel inferior, o título já vem do diálogo. */
  showTitle?: boolean;
}

export function WordDetail({ token, lang, speech, showTitle = true }: WordDetailProps) {
  const title = showTitle && (
    <h2 className="font-display text-[22px] font-bold" id="titulo-detalhe">
      <span lang={lang}>{token.original}</span>
    </h2>
  );

  if (token.kind === 'unknown') {
    return (
      <div>
        {title}
        <p className={NOTE}>
          Esta palavra não está no dicionário, e a estimativa pela grafia ainda não está disponível. Confirme
          a pronúncia com uma fonte confiável.
        </p>
        <SpeakButton className="mt-3" text={token.original} speech={speech} />
      </div>
    );
  }

  const p = token.primary;
  const note = stressNote(p);
  return (
    <div>
      {title}
      <p className="mt-1 text-3xl leading-tight">
        <PronunciationText p={p} mode="syllabic" />
      </p>
      <p className="mt-0.5 font-ipa text-sm text-muted">
        <span className="sr-only">Transcrição IPA: </span>/{p.ipa}/
      </p>

      {token.origin === 'estimated' ? (
        <p className={NOTE}>
          Esta palavra não está no dicionário. A pronúncia foi <strong>estimada</strong> pela grafia e pode
          estar errada. Confirme com uma fonte confiável.
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          Fonte: {token.source ? SOURCES[token.source].name : 'dicionário'}
          {token.agree > 0 && ` · confirmada por mais ${token.agree} fonte${token.agree > 1 ? 's' : ''}`}
          {token.proper && ' · nome próprio'}
        </p>
      )}
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}

      <SpeakButton className="mt-3" text={token.original} speech={speech} />

      <h3 className="mt-4 mb-2 text-sm font-bold text-ink-2">Som a som</h3>
      <SoundBySound p={p} />

      {token.variants.length > 0 && (
        <>
          <h3 className="mt-4 mb-2 text-sm font-bold text-ink-2">Outras pronúncias</h3>
          <ul className="flex flex-col gap-1.5">
            {token.variants.map((v, i) => (
              <li key={i} className="rounded-control border border-line px-3 py-2">
                <PronunciationText p={v} mode="syllabic" className="text-lg" />
                <span aria-hidden="true" className="ml-2 font-ipa text-xs text-muted">
                  /{v.ipa}/
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
