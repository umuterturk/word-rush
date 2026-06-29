import type { MatchSnapshot } from '../multiplayer/types';
import type { GameLanguage } from '../domain/types';
import type { SavedGameSession } from '../domain/savedGameSession';
import type { BadgeCounts } from '../domain/badges';
import type { PlayerLifetimeStats } from '../domain/playerStats';
import type { FriendEntry, GameRequest } from '../friends/types';

/**
 * Abstracts wall-clock time and the animation frame scheduler.
 * The domain never calls these directly — only the UI layer does.
 */
export interface ClockPort {
  /** Current wall-clock time in milliseconds (monotonic). */
  now(): number;
  /** Schedule a callback for the next animation frame. Returns a cancellable handle. */
  requestFrame(callback: (time: number) => void): number;
  /** Cancel a previously scheduled frame. */
  cancelFrame(handle: number): void;
}

/**
 * Persists and retrieves the player's best score.
 * Single-player MVP uses LocalStorage; future cloud variant replaces this port.
 */
export interface StoragePort {
  saveBestScore(score: number): Promise<void>;
  loadBestScore(): Promise<number>;
  saveUsername(name: string): Promise<void>;
  loadUsername(): Promise<string>;
  saveGameSession(session: SavedGameSession): Promise<void>;
  loadGameSession(): Promise<SavedGameSession | null>;
  clearGameSession(): Promise<void>;
  saveBadgeStats(counts: BadgeCounts): Promise<void>;
  loadBadgeStats(): Promise<BadgeCounts>;
  savePlayerLifetimeStats(stats: PlayerLifetimeStats): Promise<void>;
  loadPlayerLifetimeStats(): Promise<PlayerLifetimeStats>;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
}

export type LeaderboardPeriod = 'all-time' | 'weekly' | 'today';

export interface LeaderboardPort {
  submitScore(name: string, score: number): Promise<void>;
  fetchTop(limit: number, period?: LeaderboardPeriod): Promise<LeaderboardEntry[]>;
}

/**
 * Synchronises matchmaking and live opponent score across clients.
 * Game logic runs locally; Firestore carries shared config + score only.
 */
export interface MultiplayerPort {
  setDisplayName(name: string): void;
  /** Set the word-list language stamped onto rooms this client creates. */
  setLanguage(language: GameLanguage): void;
  createRoom(): Promise<string>;
  joinRoom(code: string): Promise<void>;
  cancel(): Promise<void>;
  subscribe(handler: (snapshot: MatchSnapshot | null) => void): () => void;
  publishScore(score: number): Promise<void>;
  /** Publish the final score and mark this player done so the result can settle. */
  markDone(finalScore: number): Promise<void>;
  /** Send a one-time "shuffle attack" at the opponent's board. */
  sendShuffle(): Promise<void>;
  requestRematch(): Promise<void>;
  /** Reconnect to an in-progress match after a page reload. */
  rejoinMatch(matchId: string): Promise<void>;
  leave(forfeit?: boolean): Promise<void>;
  /** Active match document id, if any. */
  getActiveMatchId(): string | null;
}

/**
 * Tracks analytics events (Firebase Analytics / GA4).
 */
export interface AnalyticsPort {
  track(event: string, params?: Record<string, string | number | boolean>): void;
}

export interface WordReportPort {
  reportWord(word: string, language: 'tr' | 'en'): Promise<void>;
}

export type { FriendEntry, GameRequest, GameRequestStatus } from '../friends/types';

export interface FriendsPort {
  syncProfile(displayName: string): Promise<void>;
  setPresence(inMatch: boolean, matchId?: string): Promise<void>;
  listFriends(): Promise<FriendEntry[]>;
  addFriend(friendUid: string, friendDisplayName: string): Promise<void>;
  isFriend(friendUid: string): Promise<boolean>;
  recordMatchResult(
    opponentUid: string,
    opponentName: string,
    result: 'win' | 'lose' | 'tie',
    matchId?: string,
  ): Promise<void>;
  sendGameRequest(toUid: string, matchId: string, inviteCode: string): Promise<GameRequest>;
  subscribeIncomingRequests(handler: (request: GameRequest | null) => void): () => void;
  acceptGameRequest(requestId: string): Promise<void>;
  declineGameRequest(requestId: string): Promise<void>;
  cancelOutgoingRequest(requestId: string): Promise<void>;
}
