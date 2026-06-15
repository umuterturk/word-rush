import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardPort } from '../ports';

export function useLeaderboard(leaderboard: LeaderboardPort) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const top = await leaderboard.fetchTop(3);
      setEntries(top);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [leaderboard]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, loading, refresh };
}
