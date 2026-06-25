import { useCallback, useEffect, useState } from 'react';
import type { FriendEntry, FriendsPort, GameRequest } from '../ports';

export function useFriends(friends: FriendsPort, enabled: boolean) {
  const [friendList, setFriendList] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomingRequest, setIncomingRequest] = useState<GameRequest | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setFriendList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await friends.listFriends();
      setFriendList(list);
    } catch {
      setFriendList([]);
    } finally {
      setLoading(false);
    }
  }, [friends, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      setIncomingRequest(null);
      return () => {};
    }
    return friends.subscribeIncomingRequests(setIncomingRequest);
  }, [friends, enabled]);

  const addFriend = useCallback(
    async (friendUid: string, friendDisplayName: string) => {
      await friends.addFriend(friendUid, friendDisplayName);
      await refresh();
    },
    [friends, refresh],
  );

  const isFriend = useCallback(
    (friendUid: string) => friends.isFriend(friendUid),
    [friends],
  );

  const recordMatchResult = useCallback(
    (
      opponentUid: string,
      opponentName: string,
      result: 'win' | 'lose' | 'tie',
      matchId?: string,
    ) => friends.recordMatchResult(opponentUid, opponentName, result, matchId),
    [friends],
  );

  const sendChallenge = useCallback(
    async (toUid: string, matchId: string, inviteCode: string) =>
      friends.sendGameRequest(toUid, matchId, inviteCode),
    [friends],
  );

  const acceptRequest = useCallback(
    async (requestId: string) => {
      await friends.acceptGameRequest(requestId);
      setIncomingRequest(null);
    },
    [friends],
  );

  const declineRequest = useCallback(
    async (requestId: string) => {
      await friends.declineGameRequest(requestId);
      setIncomingRequest(null);
    },
    [friends],
  );

  const dismissIncomingRequest = useCallback(() => {
    setIncomingRequest(null);
  }, []);

  return {
    friendList,
    loading,
    incomingRequest,
    refresh,
    addFriend,
    isFriend,
    recordMatchResult,
    sendChallenge,
    acceptRequest,
    declineRequest,
    dismissIncomingRequest,
  };
}
