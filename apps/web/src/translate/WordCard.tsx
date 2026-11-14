import type { UnknownToken, WordToken } from '@falagringo/engine';
import { PronunciationText, type ReadingMode } from './Pronunciation';

const BADGE =
  'rounded-full border border-dashed border-muted px-2 py-px text-[11px] font-semibold text-ink-2';

/** Cartão de uma palavra: original, grafia PT-BR e IPA. O detalhe som a som chega na T4.3. */
export function WordCard({ token, mode }: { token: WordToken | UnknownToken; mode: ReadingMode }) {
  if (token.kind === 'unknown') {
    return (
      <li className="flex min-w-[120px] flex-col gap-1.5 rounded-card border-2 border-dashed border-line-strong bg-surface px-4 py-3.5">
        <span className="text-sm text-muted">{token.original}</span>
        <span className="text-[15px] font-semibold text-ink-2">Fora do dicionário</span>
        <span className="text-xs text-muted">Ainda sem estimativa para esta palavra.</span>
      </li>
    );
  }
  return (
    <li className="flex min-w-[120px] flex-col gap-1.5 rounded-card border-2 border-line bg-surface px-4 py-3.5">
      <span className="flex items-center gap-2 text-sm text-muted">
        {token.original}
        {token.origin === 'estimated' && <span className={BADGE}>estimado</span>}
      </span>
      <PronunciationText p={token.primary} mode={mode} className="text-[26px] leading-tight" />
      <span className="font-ipa text-xs text-muted">/{token.primary.ipa}/</span>
    </li>
  );
}
