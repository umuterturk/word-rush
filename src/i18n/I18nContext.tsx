import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { syncPwaMetadata } from './syncPwaMetadata';
import { translations, type Language, type Translations } from './translations';

const STORAGE_KEY = 'word-rush:language';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === 'en' || stored === 'tr') return stored;
  } catch {
    // Ignore localStorage errors
  }
  
  // Detect browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('tr')) return 'tr';
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    syncPwaMetadata(translations[language], language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
