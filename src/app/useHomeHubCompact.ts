import { useLayoutEffect, useRef, type RefObject } from 'react';

/** 0 = full, 1 = hide badges, 2 = hide badges + daily top 3. Play buttons always stay. */
function applyHomeHubCompact(hub: HTMLElement): void {
  for (const level of [0, 1, 2] as const) {
    hub.dataset.compact = String(level);
    if (hub.scrollHeight <= hub.clientHeight + 1) return;
  }
  hub.dataset.compact = '2';
}

export function useHomeHubCompact(deps: unknown[]): RefObject<HTMLDivElement | null> {
  const hubRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const hub = hubRef.current;
    if (!hub) return;

    const fit = () => applyHomeHubCompact(hub);

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(hub);
    const parent = hub.parentElement;
    if (parent) ro.observe(parent);

    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remeasure when home content changes
  }, deps);

  return hubRef;
}
