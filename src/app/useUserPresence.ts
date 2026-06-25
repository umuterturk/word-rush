import { useEffect } from 'react';
import type { FriendsPort } from '../ports';

const HEARTBEAT_MS = 30_000;

export function useUserPresence(
  friends: FriendsPort,
  displayName: string,
  inMatch: boolean,
  matchId: string | undefined,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    void friends.syncProfile(displayName);
  }, [friends, enabled, displayName]);

  useEffect(() => {
    if (!enabled) return;

    void friends.setPresence(inMatch, matchId);

    if (inMatch) return;

    const interval = window.setInterval(() => {
      void friends.setPresence(false);
    }, HEARTBEAT_MS);

    return () => window.clearInterval(interval);
  }, [friends, enabled, inMatch, matchId]);
}
