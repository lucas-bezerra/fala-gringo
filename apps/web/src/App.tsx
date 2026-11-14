import type { Lang } from '@falagringo/engine';
import { useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/app/AppHeader';
import { ROUTE_TITLE, useRoute } from '@/app/route';
import { DEFAULT_LANG } from '@/engine/langs';
import { PresenterScreen } from '@/present/PresenterScreen';
import { TranslateScreen } from '@/translate/TranslateScreen';
import { ToastProvider } from '@/ui';

const EXAMPLE = 'Thank you for watching the news';
const SCRIPT_EXAMPLE =
  'Correspondentes em Worcester, Massachusetts, e em Greenwich, em Londres, acompanham o caso.';

export default function App() {
  const route = useRoute();
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [text, setText] = useState(EXAMPLE);
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
    <ToastProvider>
      {route === 'apresentar' ? (
        <PresenterScreen headingRef={mainHeading} script={script} setScript={setScript} lang={lang} />
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
        </>
      )}
    </ToastProvider>
  );
}
