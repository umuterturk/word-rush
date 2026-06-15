import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/noto-sans/latin-ext-700.css';
import '@fontsource/noto-sans/latin-ext-900.css';
import './styles/global.css';
import { initPwaUpdate } from './app/pwaUpdate';
import { I18nProvider } from './i18n';
import App from './App.tsx';

initPwaUpdate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
