import { useI18n } from '../i18n';
import { useInstallPrompt } from './useInstallPrompt';

export function InstallBanner() {
  const { t } = useI18n();
  const { showPrompt, canInstall, install, dismiss } = useInstallPrompt();

  if (!showPrompt) return null;

  return (
    <div className="install-banner" role="region" aria-label={t.installTitle}>
      <div className="install-banner__content">
        <p className="install-banner__title">{t.installTitle}</p>
        <p className="install-banner__hint">
          {canInstall ? t.installHint : t.installHintIos}
        </p>
      </div>
      <div className="install-banner__actions">
        {canInstall && (
          <button type="button" className="install-banner__install" onClick={() => void install()}>
            {t.installAction}
          </button>
        )}
        <button type="button" className="install-banner__dismiss" onClick={dismiss} aria-label={t.installDismiss}>
          ×
        </button>
      </div>
    </div>
  );
}
