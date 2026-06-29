import { useCallback, useEffect, useRef, useState } from 'react';
import { addBadgeIds, type BadgeCounts, type BadgeId } from '../domain/badges';
import {
  EMPTY_PLAYER_STATS,
  resolveNewMilestoneBadges,
  type PlayerLifetimeStats,
} from '../domain/playerStats';
import type { StoragePort } from '../ports';

interface RecordMatchOptions {
  mode: 'solo' | 'multiplayer';
  won?: boolean;
}

export function usePlayerLifetimeStats(
  storage: StoragePort,
  addBadges: (delta: Partial<BadgeCounts>) => Promise<void> | void,
) {
  const [stats, setStats] = useState<PlayerLifetimeStats>(EMPTY_PLAYER_STATS);
  const [loaded, setLoaded] = useState(false);
  const statsRef = useRef<PlayerLifetimeStats>(EMPTY_PLAYER_STATS);

  useEffect(() => {
    let active = true;
    void storage.loadPlayerLifetimeStats().then(next => {
      if (!active) return;
      statsRef.current = next;
      setStats(next);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [storage]);

  const applyStatsUpdate = useCallback(
    (next: PlayerLifetimeStats) => {
      const prev = statsRef.current;
      const milestones = resolveNewMilestoneBadges(prev, next);
      statsRef.current = next;
      setStats(next);
      void storage.savePlayerLifetimeStats(next);
      if (milestones.length > 0) {
        void addBadges(addBadgeIds({} as BadgeCounts, milestones as BadgeId[]));
      }
    },
    [storage, addBadges],
  );

  const recordCompletedMatch = useCallback(
    (options: RecordMatchOptions) => {
      const prev = statsRef.current;
      const next: PlayerLifetimeStats = { ...prev };

      if (options.mode === 'solo') {
        next.soloGamesCompleted += 1;
      } else {
        next.multiplayerGamesCompleted += 1;
        if (options.won) next.multiplayerWins += 1;
      }

      applyStatsUpdate(next);
    },
    [applyStatsUpdate],
  );

  return { stats, loaded, recordCompletedMatch };
}
