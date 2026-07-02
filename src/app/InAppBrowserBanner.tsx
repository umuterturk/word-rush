import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { detectInAppBrowser, isIos, openInExternalBrowser } from './inAppBrowser';

/** Brief pause so the gate paints before the intent hand-off. */
const AUTO_REDIRECT_MS = 350;

export function InAppBrowserBanner() {
  const { t } = useI18n();
  const info = useMemo(() => detectInAppBrowser(), []);
  const [copied, setCopied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const android = !isIos();

  useEffect(() => {
    if (!info.isInApp || !android) return;

    const timer = window.setTimeout(() => {
      setRedirecting(true);
      openInExternalBrowser();
    }, AUTO_REDIRECT_MS);

    return () => window.clearTimeout(timer);
  }, [info.isInApp, android]);

  const handleOpenExternal = useCallback(() => {
    setRedirecting(true);
    if (openInExternalBrowser()) return;

    void navigator.clipboard
      .writeText(window.location.href)
      .then(() => setCopied(true))
      .catch(() => {});
  }, []);

  if (!info.isInApp) return null;

  const appLabel =
    info.kind === 'whatsapp'
      ? t.inAppBrowserAppWhatsApp
      : info.kind === 'instagram'
        ? t.inAppBrowserAppInstagram
        : info.kind === 'facebook'
          ? t.inAppBrowserAppFacebook
          : info.kind === 'telegram'
            ? t.inAppBrowserAppTelegram
            : t.inAppBrowserAppGeneric;

  return (
    <div className="in-app-browser-gate" role="alertdialog" aria-modal="true" aria-labelledby="in-app-gate-title">
      <div className="in-app-browser-gate__card">
        <p className="in-app-browser-gate__eyebrow">{t.inAppBrowserEyebrow}</p>
        <h2 id="in-app-gate-title" className="in-app-browser-gate__title">
          {t.inAppBrowserTitle.replace('{game}', t.pwaName)}
        </h2>
        <p className="in-app-browser-gate__subtitle">
          {t.inAppBrowserSubtitle.replace('{app}', appLabel).replace('{game}', t.pwaName)}
        </p>

        {redirecting && android ? (
          <p className="in-app-browser-gate__status">{t.inAppBrowserRedirecting}</p>
        ) : (
          <ol className="in-app-browser-gate__steps">
            {isIos() ? (
              <>
                <li>
                  <span className="in-app-browser-gate__step-icon" aria-hidden="true">⋯</span>
                  {t.inAppBrowserStepIosMenu}
                </li>
                <li>
                  <span
                    className="in-app-browser-gate__step-icon in-app-browser-gate__step-icon--accent"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                  {t.inAppBrowserStepIosOpen.replace('{game}', t.pwaName)}
                </li>
              </>
            ) : (
              <>
                <li>
                  <span
                    className="in-app-browser-gate__step-icon in-app-browser-gate__step-icon--accent"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                  {t.inAppBrowserStepAndroidAuto.replace('{game}', t.pwaName)}
                </li>
                <li>
                  <span className="in-app-browser-gate__step-icon" aria-hidden="true">⋮</span>
                  {t.inAppBrowserStepAndroidMenu}
                </li>
              </>
            )}
          </ol>
        )}

        {copied && <p className="in-app-browser-gate__hint">{t.inAppBrowserLinkCopied}</p>}

        {android && (
          <button type="button" className="in-app-browser-gate__cta" onClick={handleOpenExternal}>
            {t.inAppBrowserOpenBrowser}
          </button>
        )}
      </div>
    </div>
  );
}
