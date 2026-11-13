/**
 * Serialização do formato intermediário em TSV (um arquivo por idioma + fonte).
 *
 *   #falagringo-intermediate v1
 *   #lang en-US
 *   #source cmudict
 *   word<TAB>ipa<TAB>rank<TAB>freq<TAB>kind
 *   water<TAB>ˈwɔtɚ<TAB>0<TAB><TAB>
 *
 * `freq` e `kind` vazios = ausentes. Caminho convencional: build/intermediate/{lang}/{source}.tsv
 */
import { isLang, validateEntry, type Entry, type Issue, type Lang } from './schema';
import { isSourceId, type SourceId } from './sources';

export const FORMAT_HEADER = '#falagringo-intermediate v1';
const COLUMNS = ['word', 'ipa', 'rank', 'freq', 'kind'] as const;

export function serializeTsv(lang: Lang, source: SourceId, entries: readonly Entry[]): string {
  const lines = [FORMAT_HEADER, `#lang ${lang}`, `#source ${source}`, COLUMNS.join('\t')];
  for (const e of entries) {
    if (e.lang !== lang || e.source !== source)
      throw new Error(`Entrada "${e.word}" é de ${e.lang}/${e.source}, mas o arquivo é ${lang}/${source}`);
    lines.push(
      [e.word, e.ipa, String(e.rank), e.freq === undefined ? '' : String(e.freq), e.kind ?? ''].join('\t'),
    );
  }
  return lines.join('\n') + '\n';
}

export interface LineIssue extends Issue {
  line: number;
}

export interface ParseResult {
  lang: Lang;
  source: SourceId;
  entries: Entry[];
  /** Problemas por linha. Linhas com `error` não entram em `entries`. */
  issues: LineIssue[];
}

export function parseTsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== FORMAT_HEADER) throw new Error(`Cabeçalho inválido: esperado "${FORMAT_HEADER}"`);

  const lang = metaValue(lines[1], 'lang');
  const source = metaValue(lines[2], 'source');
  if (!isLang(lang)) throw new Error(`Idioma não suportado no cabeçalho: ${lang}`);
  if (!isSourceId(source)) throw new Error(`Fonte não registrada no cabeçalho: ${source}`);
  if (lines[3] !== COLUMNS.join('\t'))
    throw new Error(`Linha de colunas inválida: esperado "${COLUMNS.join(' ')}"`);

  const entries: Entry[] = [];
  const issues: LineIssue[] = [];
  for (let i = 4; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === '') continue;
    const lineNo = i + 1;
    const cols = raw.split('\t');
    if (cols.length !== COLUMNS.length) {
      issues.push({
        line: lineNo,
        severity: 'error',
        field: 'word',
        message: `esperava ${COLUMNS.length} colunas, veio ${cols.length}`,
      });
      continue;
    }
    const [word, ipa, rank, freq, kind] = cols;
    const entry: Entry = {
      word,
      ipa,
      lang,
      source,
      rank: rank === '' ? NaN : Number(rank),
      ...(freq !== '' && { freq: Number(freq) }),
      ...(kind !== '' && { kind: kind as Entry['kind'] }),
    };
    const lineIssues = validateEntry(entry);
    issues.push(...lineIssues.map((it) => ({ ...it, line: lineNo })));
    if (!lineIssues.some((it) => it.severity === 'error')) entries.push(entry);
  }
  return { lang, source, entries, issues };
}

function metaValue(line: string | undefined, key: string): string {
  const prefix = `#${key} `;
  if (!line?.startsWith(prefix)) throw new Error(`Linha de metadado "#${key}" ausente`);
  return line.slice(prefix.length).trim();
}
