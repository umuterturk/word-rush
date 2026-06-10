export type MatchMode = 'quick' | 'private';

export type FirestoreMatchStatus = 'waiting' | 'ready' | 'ended';

export type MatchPhase =
  | 'idle'
  | 'searching'
  | 'waiting'
  | 'ready'
  | 'playing'
  | 'ended';

export type MatchResult = 'win' | 'lose' | 'tie';

export interface MatchPlayer {
  name: string;
  score: number;
  joinedAt: number;
}

export interface MatchConfig {
  matchId: string;
  mode: MatchMode;
  inviteCode: string | null;
  seed: string;
  matchDuration: number;
  status: FirestoreMatchStatus;
  round: number;
  opponentUid: string;
  opponentName: string;
}

export interface MatchSnapshot {
  matchId: string;
  mode: MatchMode;
  inviteCode: string | null;
  seed: string;
  matchDuration: number;
  status: FirestoreMatchStatus;
  round: number;
  opponentUid: string;
  opponentName: string;
  opponentScore: number;
  opponentWantsRematch: boolean;
  /** Nonce of the latest shuffle attack the opponent sent at us (0 = none). */
  incomingShuffleNonce: number;
}

export interface MatchDoc {
  mode: MatchMode;
  inviteCode: string | null;
  status: FirestoreMatchStatus;
  seed: string;
  matchDuration: number;
  round: number;
  createdBy: string;
  createdAt: unknown;
  players: Record<string, MatchPlayer>;
  rematchReady?: Record<string, boolean>;
  /** Map of attacker uid -> nonce. The target reads the entry NOT keyed by itself. */
  shuffleAttacks?: Record<string, number>;
}
