import { useCallback, useEffect, useState } from 'react';
import { LEADERBOARD_TOP_COUNT } from '../domain/constants';
import type { LeaderboardEntry, LeaderboardPort } from '../ports';

export function useLeaderboard(leaderboard: LeaderboardPort) {
  const [allTimeEntries, setAllTimeEntries] = useState<LeaderboardEntry[]>([]);
  const [todayEntries, setTodayEntries] = useState<LeaderboardEntry[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [allTime, today, weekly] = await Promise.all([
        leaderboard.fetchTop(LEADERBOARD_TOP_COUNT, 'all-time'),
        leaderboard.fetchTop(LEADERBOARD_TOP_COUNT, 'today'),
        leaderboard.fetchTop(LEADERBOARD_TOP_COUNT, 'weekly'),
      ]);
      setAllTimeEntries(allTime);
      setTodayEntries(today);
      setWeeklyEntries(weekly);
    } catch {
      setAllTimeEntries([]);
      setTodayEntries([]);
      setWeeklyEntries([]);
    } finally {
      setLoading(false);
    }
  }, [leaderboard]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { allTimeEntries, todayEntries, weeklyEntries, loading, refresh };
}
