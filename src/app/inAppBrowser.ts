/** In-app browsers (WhatsApp, Instagram, etc.) use isolated storage — no shared auth. */

export type InAppBrowserKind = 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'other';

export interface InAppBrowserInfo {
  kind: InAppBrowserKind;
  /** True when the page runs inside a messaging/social in-app webview. */
  isInApp: boolean;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function detectInAppBrowser(): InAppBrowserInfo {
  if (isStandalone()) return { kind: 'other', isInApp: false };

  const ua = navigator.userAgent;

  if (/WhatsApp/i.test(ua)) return { kind: 'whatsapp', isInApp: true };
  if (/Instagram/i.test(ua)) return { kind: 'instagram', isInApp: true };
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return { kind: 'facebook', isInApp: true };
  if (/Telegram/i.test(ua)) return { kind: 'telegram', isInApp: true };

  // Generic Android WebView (no Chrome token) or iOS in-app patterns.
  const isAndroidWebView = /Android/i.test(ua) && /wv\)/.test(ua);
  const isIosInApp =
    /iPhone|iPad|iPod/i.test(ua) &&
    !/Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/i.test(ua);

  if (isAndroidWebView || isIosInApp) return { kind: 'other', isInApp: true };

  return { kind: 'other', isInApp: false };
}

export function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Best-effort: open the current page in the system browser (Android Chrome intent). */
export function openInExternalBrowser(url = window.location.href): boolean {
  if (!isIos() && /Android/i.test(navigator.userAgent)) {
    const stripped = url.replace(/^https?:\/\//, '');
    const fallback = encodeURIComponent(url);
    window.location.href =
      `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;` +
      `S.browser_fallback_url=${fallback};end`;
    return true;
  }
  return false;
}
