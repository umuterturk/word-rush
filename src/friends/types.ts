export interface FriendEntry {
  uid: string;
  displayName: string;
  wins: number;
  losses: number;
  ties: number;
  lastPlayedAt?: number;
}

export type GameRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface GameRequest {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  matchId: string;
  inviteCode: string;
  status: GameRequestStatus;
  createdAt: number;
}

export interface UserProfileDoc {
  displayName: string;
  updatedAt: unknown;
  lastSeenAt: unknown;
  inMatch: boolean;
  currentMatchId?: string;
}

export interface FriendDoc {
  displayName: string;
  addedAt: unknown;
  lastPlayedAt?: unknown;
}

export interface FriendRivalDoc {
  uids: [string, string];
  wins: Record<string, number>;
  ties: number;
  lastMatchAt: unknown;
  lastMatchId?: string;
}

export interface GameRequestDoc {
  fromUid: string;
  fromName: string;
  toUid: string;
  matchId: string;
  inviteCode: string;
  status: GameRequestStatus;
  createdAt: unknown;
  expiresAt: unknown;
}
