import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_BADGE_COUNTS,
  mergeBadgeCounts,
  parseBadgeCounts,
  type BadgeCounts,
} from '../domain/badges';
import type { StoragePort } from '../ports';

export function useBadgeStats(storage: StoragePort) {
  const [badges, setBadges] = useState<BadgeCounts>(EMPTY_BADGE_COUNTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void storage.loadBadgeStats().then(counts => {
      if (!active) return;
      setBadges(parseBadgeCounts(counts));
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [storage]);

  const addBadges = useCallback(
    async (delta: Partial<BadgeCounts>) => {
      setBadges(prev => {
        const next = mergeBadgeCounts(prev, delta);
        void storage.saveBadgeStats(next);
        return next;
      });
    },
    [storage],
  );

  return { badges, addBadges, loaded };
}
