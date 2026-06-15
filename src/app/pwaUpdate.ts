import { registerSW } from 'virtual:pwa-register';

type UpdateListener = (available: boolean) => void;

let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistration: ServiceWorkerRegistration | undefined;
let launchPhase = true;
const listeners = new Set<UpdateListener>();

function notify() {
  const available = applyUpdate !== null;
  listeners.forEach((listener) => listener(available));
}

export function subscribeAppUpdate(listener: UpdateListener): () => void {
  listeners.add(listener);
  listener(applyUpdate !== null);
  return () => listeners.delete(listener);
}

export async function reloadWithUpdate(): Promise<void> {
  if (!applyUpdate) return;
  await applyUpdate(true);
}

export function checkForUpdate(): void {
  void swRegistration?.update();
}

export function initPwaUpdate() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      applyUpdate = updateSW;
      notify();
      if (launchPhase) void reloadWithUpdate();
    },
    onRegisteredSW(_swUrl, registration) {
      swRegistration = registration;
      checkForUpdate();
      window.setTimeout(() => {
        launchPhase = false;
      }, 1_000);
    },
  });
}
