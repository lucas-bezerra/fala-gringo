/**
 * Pacotes offline (T4.8). Os shards ficam no Cache Storage "fg-dict", o mesmo que o service worker usa
 * (CacheFirst): baixar aqui = funcionar offline depois; o uso normal também vai enchendo o cache aos poucos.
 */
import type { Manifest } from '@falagringo/data/shards';
import type { Lang } from '@falagringo/engine';

export const DICT_CACHE = 'fg-dict';
/** Mesmo nome do cache NetworkFirst do service worker (vite.config.ts). */
const MANIFEST_CACHE = 'fg-dict-manifest';
const BASE = `${import.meta.env.BASE_URL}dict/`;
const CHANGE = 'fg-offline-change';

export interface Pack {
  id: string;
  files: string[];
  /** Tamanho guardado no aparelho (sem compressão). */
  bytes: number;
  /** Tamanho aproximado do download (gzip). */
  gzip: number;
}

export const offlineSupported = (): boolean =>
  typeof window !== 'undefined' && 'caches' in window && 'serviceWorker' in navigator;

export async function fetchManifest(): Promise<Manifest> {
  const res = await fetch(BASE + 'manifest.json');
  if (!res.ok) throw new Error(`Não foi possível ler os dados (HTTP ${res.status}).`);
  return (await res.json()) as Manifest;
}

const url = (file: string) => new URL(BASE + file, window.location.href).href;

export function langPack(manifest: Manifest, lang: Lang): Pack | undefined {
  const shards = manifest.langs[lang]?.shards;
  if (!shards) return undefined;
  return {
    id: lang,
    files: shards.map((s) => url(s.file)),
    bytes: shards.reduce((n, s) => n + s.bytes, 0),
    gzip: shards.reduce((n, s) => n + s.gzip, 0),
  };
}

export function lexiconPack(manifest: Manifest): Pack | undefined {
  const lex = manifest.lexicons?.['pt-BR'];
  return lex ? { id: 'pt-BR-lexicon', files: [url(lex.file)], bytes: lex.bytes, gzip: lex.gzip } : undefined;
}

async function cachedUrls(): Promise<Set<string>> {
  const cache = await caches.open(DICT_CACHE);
  return new Set((await cache.keys()).map((r) => r.url));
}

/** Quantos arquivos do pacote já estão no aparelho. */
export async function cachedCount(pack: Pack): Promise<number> {
  const have = await cachedUrls();
  return pack.files.filter((f) => have.has(f)).length;
}

function notify() {
  window.dispatchEvent(new Event(CHANGE));
}

export function onOfflineChange(listener: () => void): () => void {
  window.addEventListener(CHANGE, listener);
  return () => window.removeEventListener(CHANGE, listener);
}

/** Baixa o que falta do pacote (4 arquivos por vez). `onProgress(feitos, total)`. */
export async function downloadPack(
  pack: Pack,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  // o manifest dos dados também precisa estar no aparelho para abrir offline
  const manifestUrl = url('manifest.json');
  const fresh = await fetch(manifestUrl, { signal });
  if (fresh.ok) await (await caches.open(MANIFEST_CACHE)).put(manifestUrl, fresh);
  const cache = await caches.open(DICT_CACHE);
  const have = await cachedUrls();
  const missing = pack.files.filter((f) => !have.has(f));
  let done = pack.files.length - missing.length;
  onProgress(done, pack.files.length);
  const queue = [...missing];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      signal?.throwIfAborted();
      const res = await fetch(f, { signal });
      if (!res.ok) throw new Error(`Falha ao baixar ${f.split('/').pop()} (HTTP ${res.status}).`);
      await cache.put(f, res);
      onProgress(++done, pack.files.length);
    }
  };
  try {
    await Promise.all([worker(), worker(), worker(), worker()]);
  } finally {
    notify();
  }
}

export async function removePack(pack: Pack): Promise<void> {
  const cache = await caches.open(DICT_CACHE);
  await Promise.all(pack.files.map((f) => cache.delete(f)));
  notify();
}

/** Apaga do cache arquivos que não estão mais no manifest (dados de versões antigas). Devolve quantos. */
export async function purgeStale(manifest: Manifest): Promise<number> {
  const keep = new Set<string>();
  for (const lang of Object.keys(manifest.langs) as Lang[])
    langPack(manifest, lang)?.files.forEach((f) => keep.add(f));
  lexiconPack(manifest)?.files.forEach((f) => keep.add(f));
  const cache = await caches.open(DICT_CACHE);
  const stale = (await cache.keys()).filter((r) => !keep.has(r.url));
  await Promise.all(stale.map((r) => cache.delete(r)));
  if (stale.length) notify();
  return stale.length;
}

export interface StorageInfo {
  usage: number;
  quota: number;
  persisted: boolean;
}

export async function storageInfo(): Promise<StorageInfo | undefined> {
  if (!navigator.storage?.estimate) return undefined;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const persisted = (await navigator.storage.persisted?.()) ?? false;
  return { usage, quota, persisted };
}

export function formatMB(bytes: number): string {
  const fmt = (n: number) =>
    n.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return bytes >= 1e9 ? `${fmt(bytes / 1e9)} GB` : `${fmt(bytes / 1e6)} MB`;
}
