import type { MatchSnapshot } from '../multiplayer/types';

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
}

/**
 * Synchronises matchmaking and live opponent score across clients.
 * Game logic runs locally; Firestore carries shared config + score only.
 */
export interface MultiplayerPort {
  quickMatch(): Promise<void>;
  createRoom(): Promise<void>;
  joinRoom(code: string): Promise<void>;
  cancel(): Promise<void>;
  subscribe(handler: (snapshot: MatchSnapshot | null) => void): () => void;
  publishScore(score: number): Promise<void>;
  /** Send a one-time "shuffle attack" at the opponent's board. */
  sendShuffle(): Promise<void>;
  requestRematch(): Promise<void>;
  leave(): Promise<void>;
}

/**
 * Tracks analytics events (Firebase Analytics / GA4).
 */
export interface AnalyticsPort {
  track(event: string, params?: Record<string, string | number | boolean>): void;
}
