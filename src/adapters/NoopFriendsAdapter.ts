import type { FriendEntry, FriendsPort, GameRequest } from '../ports';

export class NoopFriendsAdapter implements FriendsPort {
  async syncProfile(_displayName: string): Promise<void> {}

  async setPresence(_inMatch: boolean, _matchId?: string): Promise<void> {}

  async listFriends(): Promise<FriendEntry[]> {
    return [];
  }

  async addFriend(_friendUid: string, _friendDisplayName: string): Promise<void> {}

  async isFriend(_friendUid: string): Promise<boolean> {
    return false;
  }

  async recordMatchResult(
    _opponentUid: string,
    _opponentName: string,
    _result: 'win' | 'lose' | 'tie',
    _matchId?: string,
  ): Promise<void> {}

  async sendGameRequest(
    _toUid: string,
    _matchId: string,
    _inviteCode: string,
  ): Promise<GameRequest> {
    throw new Error('Friends are not available.');
  }

  subscribeIncomingRequests(_handler: (request: GameRequest | null) => void): () => void {
    return () => {};
  }

  async acceptGameRequest(_requestId: string): Promise<void> {}

  async declineGameRequest(_requestId: string): Promise<void> {}

  async cancelOutgoingRequest(_requestId: string): Promise<void> {}
}
