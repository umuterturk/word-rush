import { useEffect, useState } from 'react';
import { checkForUpdate, reloadWithUpdate, subscribeAppUpdate } from './pwaUpdate';

const MENU_CHECK_MS = 15 * 60 * 1_000;

/** Checks for updates on the main menu every 15 minutes and applies them silently. */
export function useAppUpdate(isMainMenu: boolean) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => subscribeAppUpdate(setUpdateAvailable), []);

  useEffect(() => {
    if (!isMainMenu) return;

    checkForUpdate();
    const intervalId = window.setInterval(checkForUpdate, MENU_CHECK_MS);
    return () => window.clearInterval(intervalId);
  }, [isMainMenu]);

  useEffect(() => {
    if (updateAvailable && isMainMenu) {
      void reloadWithUpdate();
    }
  }, [updateAvailable, isMainMenu]);
}
