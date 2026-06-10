import { useI18n } from '../i18n/I18nContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="language-switcher">
      <button
        className={`lang-btn ${language === 'en' ? 'lang-btn--active' : ''}`}
        onClick={() => setLanguage('en')}
        aria-label="English"
      >
        EN
      </button>
      <button
        className={`lang-btn ${language === 'tr' ? 'lang-btn--active' : ''}`}
        onClick={() => setLanguage('tr')}
        aria-label="Türkçe"
      >
        TR
      </button>
    </div>
  );
}
