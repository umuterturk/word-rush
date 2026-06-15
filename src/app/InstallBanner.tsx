import { useI18n } from '../i18n';
import { useInstallPrompt, type InstallMode } from './useInstallPrompt';

const APP_ICON = `${import.meta.env.BASE_URL}pwa-192x192.png`;

function ManualSteps({ mode }: { mode: InstallMode }) {
  const { t } = useI18n();

  if (mode === 'ios') {
    return (
      <ol className="install-banner__steps">
        <li>
          <span className="install-banner__step-icon" aria-hidden="true">↑</span>
          {t.installStepIosShare}
        </li>
        <li>
          <span className="install-banner__step-icon" aria-hidden="true">＋</span>
          {t.installStepIosAdd}
        </li>
      </ol>
    );
  }

  if (mode === 'firefox') {
    return (
      <ol className="install-banner__steps">
        <li>
          <span className="install-banner__step-icon" aria-hidden="true">⋮</span>
          {t.installStepFirefoxMenu}
        </li>
        <li>
          <span className="install-banner__step-icon install-banner__step-icon--accent" aria-hidden="true">↓</span>
          {t.installStepFirefoxInstall}
        </li>
      </ol>
    );
  }

  return (
    <ol className="install-banner__steps">
      <li>
        <span className="install-banner__step-icon" aria-hidden="true">⋮</span>
        {t.installStepManualMenu}
      </li>
      <li>
        <span className="install-banner__step-icon install-banner__step-icon--accent" aria-hidden="true">＋</span>
        {t.installStepManualAdd}
      </li>
    </ol>
  );
}

export function InstallBanner() {
  const { t } = useI18n();
  const { showPrompt, canInstall, installMode, install, dismiss } = useInstallPrompt();

  if (!showPrompt || !installMode) return null;

  return (
    <div className="install-banner" role="region" aria-label={t.installTitle}>
      <div className="install-banner__glow" aria-hidden="true" />

      <img className="install-banner__icon" src={APP_ICON} alt="" width={48} height={48} />

      <div className="install-banner__body">
        <p className="install-banner__eyebrow">{t.installEyebrow}</p>
        <p className="install-banner__title">{t.installTitle}</p>
        <p className="install-banner__subtitle">{t.installSubtitle}</p>

        {canInstall ? (
          <p className="install-banner__hint">{t.installHint}</p>
        ) : (
          <ManualSteps mode={installMode} />
        )}
      </div>

      <div className="install-banner__actions">
        {canInstall && (
          <button type="button" className="install-banner__cta" onClick={() => void install()}>
            {t.installAction}
          </button>
        )}
        <button
          type="button"
          className="install-banner__dismiss"
          onClick={dismiss}
          aria-label={t.installDismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
