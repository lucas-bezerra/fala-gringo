import type { Lang } from '@falagringo/engine';
import { useEffect, useState } from 'react';
import { cachedCount, fetchManifest, langPack, offlineSupported, onOfflineChange } from './offlineStore';

/** O idioma está inteiro no aparelho? (selo "disponível offline" na tela Traduzir) */
export function useOfflineReady(lang: Lang): boolean {
  const [ready, setReady] = useState<{ lang: Lang; ok: boolean }>();
  useEffect(() => {
    if (!offlineSupported()) return;
    let live = true;
    const check = () =>
      void fetchManifest()
        .then((m) => {
          const pack = langPack(m, lang);
          return pack ? cachedCount(pack).then((n) => n === pack.files.length) : false;
        })
        .then((ok) => live && setReady({ lang, ok }))
        .catch(() => {});
    check();
    const off = onOfflineChange(check);
    return () => {
      live = false;
      off();
    };
  }, [lang]);
  return ready?.lang === lang && ready.ok;
}
