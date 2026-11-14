import type { Lang } from '@falagringo/engine';
import { useEffect, useRef, useState } from 'react';
import { AppFooter } from '@/app/AppFooter';
import { AppHeader } from '@/app/AppHeader';
import { CreditsScreen } from '@/app/CreditsScreen';
import { setupPwa } from '@/app/pwa';
import { OfflineScreen } from '@/offline/OfflineScreen';
import { readShared } from '@/app/share';
import { ROUTE_TITLE, useRoute } from '@/app/route';
import { DEFAULT_LANG } from '@/engine/langs';
import { PresenterScreen } from '@/present/PresenterScreen';
import { TranslateScreen } from '@/translate/TranslateScreen';
import { ToastProvider, useToast } from '@/ui';

const EXAMPLE = 'Thank you for watching the news';
const SCRIPT_EXAMPLE =
  'Correspondentes em Worcester, Massachusetts, e em Greenwich, em Londres, acompanham o caso.';

export default function App() {
  return (
    <ToastProvider>
      <Screens />
    </ToastProvider>
  );
}

function Screens() {
  const toast = useToast();
  useEffect(() => {
    setupPwa((apply) =>
      toast.show('Nova versão do FalaGringo disponível.', 30 * 60_000, {
        label: 'Atualizar',
        onClick: apply,
      }),
    );
  }, [toast]);

  const route = useRoute();
  // link compartilhado (?t=&l=) abre direto com o texto e o idioma
  const [shared] = useState(readShared);
  const [lang, setLang] = useState<Lang>(shared.lang ?? DEFAULT_LANG);
  const [text, setText] = useState(shared.text ?? EXAMPLE);
  // O roteiro do apresentador é separado: entra com o texto da tela Traduzir ao clicar em "Apresentar".
  const [script, setScript] = useState(SCRIPT_EXAMPLE);
  const firstRender = useRef(true);
  const mainHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = ROUTE_TITLE[route];
    // Ao trocar de tela, leva o foco ao título (o leitor de tela anuncia a tela nova); não na 1ª carga.
    if (firstRender.current) firstRender.current = false;
    else mainHeading.current?.focus();
  }, [route]);

  return (
    <>
      {route === 'apresentar' ? (
        <>
          <PresenterScreen headingRef={mainHeading} script={script} setScript={setScript} lang={lang} />
          <div className="bg-stage">
            <AppFooter dark />
          </div>
        </>
      ) : route === 'offline' ? (
        <>
          <AppHeader route={route} />
          <OfflineScreen headingRef={mainHeading} />
          <AppFooter />
        </>
      ) : route === 'creditos' ? (
        <>
          <AppHeader route={route} />
          <CreditsScreen headingRef={mainHeading} />
          <AppFooter />
        </>
      ) : (
        <>
          <AppHeader route={route} />
          <TranslateScreen
            headingRef={mainHeading}
            text={text}
            setText={setText}
            lang={lang}
            setLang={setLang}
            onPresent={() => setScript(text)}
          />
          <AppFooter />
        </>
      )}
    </>
  );
}
