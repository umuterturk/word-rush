import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallMode = 'native' | 'ios' | 'firefox' | 'manual';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isFirefox(): boolean {
  return /firefox/i.test(navigator.userAgent);
}

function isMobile(): boolean {
  return (
    /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 900)
  );
}

function getManualInstallMode(): InstallMode | null {
  if (isStandalone()) return null;
  if (isIos()) return 'ios';
  if (isFirefox() && isMobile()) return 'firefox';
  if (isMobile()) return 'manual';
  return null;
}

/** Delay before showing manual instructions so Chromium has time to fire beforeinstallprompt. */
const MANUAL_PROMPT_DELAY_MS = 2_000;

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === '1');
  const [installed, setInstalled] = useState(isStandalone);
  const [manualReady, setManualReady] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (deferredPrompt || installed || dismissed) return;

    const manual = getManualInstallMode();
    if (manual === 'ios' || manual === 'firefox') {
      setManualReady(true);
      return;
    }

    const timer = window.setTimeout(() => setManualReady(true), MANUAL_PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [deferredPrompt, installed, dismissed]);

  const dismiss = useCallback(() => {
    localStorage.setItem('pwa-install-dismissed', '1');
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (outcome === 'accepted') {
      setInstalled(true);
      return true;
    }

    return false;
  }, [deferredPrompt]);

  const manualMode = getManualInstallMode();
  const canInstall = deferredPrompt !== null;
  const installMode: InstallMode | null = canInstall ? 'native' : manualReady ? manualMode : null;
  const showPrompt = !installed && !dismissed && installMode !== null;

  return {
    showPrompt,
    canInstall,
    installMode,
    install,
    dismiss,
  };
}
