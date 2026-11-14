import { TranslateScreen } from '@/translate/TranslateScreen';
import { ToastProvider } from '@/ui';

export default function App() {
  return (
    <ToastProvider>
      <TranslateScreen />
    </ToastProvider>
  );
}
