import type { MatchSnapshot } from '../multiplayer/types';
import type { SavedGameSession } from '../domain/savedGameSession';

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
}

export interface LeaderboardEntry {
  name: string;
  score: number;
}

export interface LeaderboardPort {
  submitScore(name: string, score: number): Promise<void>;
  fetchTop(limit: number): Promise<LeaderboardEntry[]>;
}

/**
 * Synchronises matchmaking and live opponent score across clients.
 * Game logic runs locally; Firestore carries shared config + score only.
 */
export interface MultiplayerPort {
  setDisplayName(name: string): void;
  quickMatch(): Promise<void>;
  createRoom(): Promise<string>;
  joinRoom(code: string): Promise<void>;
  cancel(): Promise<void>;
  subscribe(handler: (snapshot: MatchSnapshot | null) => void): () => void;
  publishScore(score: number): Promise<void>;
  /** Send a one-time "shuffle attack" at the opponent's board. */
  sendShuffle(): Promise<void>;
  requestRematch(): Promise<void>;
  /** Reconnect to an in-progress match after a page reload. */
  rejoinMatch(matchId: string): Promise<void>;
  leave(): Promise<void>;
}

/**
 * Tracks analytics events (Firebase Analytics / GA4).
 */
export interface AnalyticsPort {
  track(event: string, params?: Record<string, string | number | boolean>): void;
}
