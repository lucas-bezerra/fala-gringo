import type { Manifest } from '@falagringo/data/shards';
import type { Lang } from '@falagringo/engine';
import { useCallback, useEffect, useState, type Ref } from 'react';
import { LANG_GROUPS } from '@/engine/langs';
import { Button } from '@/ui';
import {
  cachedCount,
  downloadPack,
  fetchManifest,
  formatMB,
  langPack,
  lexiconPack,
  offlineSupported,
  onOfflineChange,
  purgeStale,
  removePack,
  storageInfo,
  type Pack,
  type StorageInfo,
} from './offlineStore';

interface Row {
  pack: Pack;
  title: string;
  detail: string;
}

function rowsFor(manifest: Manifest): Row[] {
  const rows: Row[] = [];
  for (const g of LANG_GROUPS) {
    for (const v of g.variants) {
      const pack = langPack(manifest, v.lang as Lang);
      if (pack)
        rows.push({ pack, title: `${g.label} (${v.label})`, detail: 'Dicionário completo da variante.' });
    }
  }
  const lex = lexiconPack(manifest);
  if (lex)
    rows.push({
      pack: lex,
      title: 'Português (modo apresentador)',
      detail: 'Reconhece as palavras em português do roteiro.',
    });
  return rows;
}

/** Gerenciador de uso offline (T4.8): baixar/remover cada idioma, com tamanho, progresso e espaço disponível. */
export function OfflineScreen({ headingRef }: { headingRef: Ref<HTMLHeadingElement> }) {
  const [manifest, setManifest] = useState<Manifest>();
  const [error, setError] = useState<string>();
  const [storage, setStorage] = useState<StorageInfo>();
  const supported = offlineSupported();

  const refreshStorage = useCallback(() => {
    void storageInfo().then(setStorage);
  }, []);

  useEffect(() => {
    if (!supported) return;
    fetchManifest()
      .then(async (m) => {
        setManifest(m);
        await purgeStale(m); // limpa dados de versões antigas
        refreshStorage();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return onOfflineChange(refreshStorage);
  }, [supported, refreshStorage]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-bold">
        Uso offline
      </h1>
      <p className="text-ink-2">
        O FalaGringo guarda neste aparelho as partes do dicionário que você usa. Para usar sem internet (no
        avião, no estúdio sem rede), baixe o idioma inteiro. Nada é enviado: os arquivos só são baixados.
      </p>

      {!supported && (
        <p role="alert" className="rounded-control border border-line bg-subtle px-3 py-2 text-ink-2">
          Este navegador não permite uso offline (ou a página não está em HTTPS).
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-control border border-special bg-special-soft px-3 py-2 text-special-ink"
        >
          {error}
        </p>
      )}

      {storage && storage.quota > 0 && (
        <p className="text-sm text-ink-2">
          Espaço usado pelo site neste aparelho: <strong>{formatMB(storage.usage)}</strong> de{' '}
          {formatMB(storage.quota)} disponíveis.
          {!storage.persisted && ' O navegador pode apagar os dados se faltar espaço.'}
        </p>
      )}

      {manifest && (
        <ul className="flex flex-col gap-3">
          {rowsFor(manifest).map((r) => (
            <PackRow key={r.pack.id} row={r} storage={storage} />
          ))}
        </ul>
      )}

      <p className="text-sm text-muted">
        Dados versão {manifest?.dataVersion ?? '…'}. Quando os dados mudam, os arquivos antigos são apagados e
        os idiomas precisam ser baixados de novo.
      </p>
    </main>
  );
}

function PackRow({ row, storage }: { row: Row; storage?: StorageInfo }) {
  const { pack } = row;
  const total = pack.files.length;
  const [have, setHave] = useState<number>();
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const check = () => void cachedCount(pack).then(setHave);
    check();
    return onOfflineChange(check);
  }, [pack]);

  const free = storage && storage.quota > 0 ? storage.quota - storage.usage : Infinity;
  const missingBytes = have === undefined ? pack.bytes : (pack.bytes * (total - have)) / total;
  const noRoom = missingBytes > free;
  const busy = progress !== undefined;
  const complete = have === total;

  const download = async () => {
    setError(undefined);
    setProgress(0);
    try {
      await navigator.storage?.persist?.(); // pede para o navegador não apagar sozinho
      await downloadPack(pack, (done) => setProgress(done));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(undefined);
    }
  };

  const status = busy
    ? `Baixando… ${progress} de ${total}`
    : complete
      ? 'Disponível offline'
      : have
        ? `Parcial: ${have} de ${total} partes (as já usadas)`
        : 'Não baixado';

  return (
    <li className="rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{row.title}</h2>
          <p className="text-sm text-ink-2">{row.detail}</p>
          <p className="mt-1 text-sm text-muted">
            Ocupa ~{formatMB(pack.bytes)} no aparelho (download de ~{formatMB(pack.gzip)}).
          </p>
        </div>
        <div className="flex gap-2">
          {!complete && (
            <Button variant="primary" size="sm" onClick={download} disabled={busy || noRoom}>
              {have ? 'Completar download' : 'Baixar'}
            </Button>
          )}
          {!!have && (
            <Button size="sm" onClick={() => void removePack(pack)} disabled={busy}>
              Remover
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold" aria-live="polite">
        {complete && <span aria-hidden="true">✓ </span>}
        {status}
      </p>
      {busy && (
        <progress
          className="mt-2 h-2 w-full accent-accent"
          max={total}
          value={progress}
          aria-label={`Download de ${row.title}`}
        />
      )}
      {noRoom && !complete && (
        <p role="alert" className="mt-2 text-sm text-special-ink">
          Espaço insuficiente neste aparelho para baixar este idioma.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-special-ink">
          {error}
        </p>
      )}
    </li>
  );
}
