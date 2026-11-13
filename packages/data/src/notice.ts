/**
 * NOTICE de dados (T2.9): créditos e licenças das fontes EM USO no merge, gerado do registro (sources.ts).
 * Publicado junto dos shards (build/dict/NOTICE.md) e versionado em packages/data/NOTICE.md.
 * O CI falha se o arquivo versionado estiver desatualizado.
 */
import { PRIORITY } from './merge';
import { SOURCES, type SourceId } from './sources';

/** Fontes do léxico do português (modo texto misto), publicado junto dos shards. */
export const LEXICON_SOURCES: readonly SourceId[] = ['wikipron', 'frequencywords'];

export function sourcesInUse(): SourceId[] {
  const used = new Set([...Object.values(PRIORITY).flat(), ...LEXICON_SOURCES]);
  return (Object.keys(SOURCES) as SourceId[]).filter((s) => used.has(s));
}

export function renderNotice(): string {
  const blocks = sourcesInUse().map((id) => {
    const s = SOURCES[id];
    const langs = [
      ...Object.entries(PRIORITY)
        .filter(([, list]) => list.includes(id))
        .map(([lang]) => lang),
      ...(LEXICON_SOURCES.includes(id) ? ['léxico pt-BR (texto misto)'] : []),
    ].join(', ');
    return [
      `## ${s.name}`,
      '',
      `- Licença: ${s.license}`,
      `- Origem: ${s.url}`,
      `- Crédito: ${s.credit}`,
      `- Idiomas: ${langs}`,
    ].join('\n');
  });
  const shareAlike = sourcesInUse()
    .filter((id) => SOURCES[id].shareAlike)
    .map((id) => SOURCES[id].name)
    .join('; ');
  return [
    '# Dados de pronúncia — créditos e licenças',
    '',
    '> Gerado por `pnpm --filter @falagringo/data notice` a partir de `src/sources.ts`. Não edite à mão.',
    '',
    `Os arquivos de dicionário derivados de fontes CC BY-SA (${shareAlike}) são distribuídos sob a **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/).`,
    '',
    ...blocks.flatMap((b) => [b, '']),
  ].join('\n');
}
