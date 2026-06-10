export type MatchStatus = 'idle' | 'playing' | 'ended';

/** A letter cell that lives in the grid. */
export interface LandedCell {
  id: string;
  letter: string;
}

export interface PlayerState {
  score: number;
  /** Per-column stacks. Each array may have gaps (undefined entries) from cleared cells. */
  columns: LandedCell[][];
  /**
   * Ordered list of selected cell IDs (tap order = word order).
   */
  selectedIds: string[];
  /** The word the player must find and spell right now. */
  targetWord: string;
  /** Number of words successfully completed (used for difficulty scaling). */
  wordsCompleted: number;
  /** Pool of words that were used to create this grid (these are the only findable words). */
  wordPool: string[];
  /** Timestamp when current target word was assigned (for per-word timer). */
  wordStartedAt: number;
}

export interface GameState {
  matchStatus: MatchStatus;
  matchStartedAt: number;
  matchDuration: number;
  seed: string;
  players: Record<string, PlayerState>;
}

export type GameAction =
  | { type: 'START_MATCH'; seed: string; at: number }
  | { type: 'END_MATCH'; at: number }
  | { type: 'RESET' }
  | { type: 'SELECT_LETTER'; playerId: string; letterId: string }
  | { type: 'CLEAR_SELECTION'; playerId: string }
  | { type: 'SUBMIT_WORD'; playerId: string }
  | { type: 'SKIP_WORD'; playerId: string }
  | { type: 'WORD_TIMEOUT'; playerId: string; at: number };
