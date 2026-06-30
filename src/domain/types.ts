export type MatchStatus = 'idle' | 'playing' | 'ended';
export type MatchMode = 'solo' | 'multiplayer';
export type SoloDifficulty = 'easy' | 'normal' | 'hard';
export type GameLanguage = 'en' | 'tr';

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
  /** Consecutive words found without skip or timeout. */
  wordStreak: number;
  /** Multiplayer 2× mode: consecutive finds while 2× is active; compounds timer/score until a miss. */
  doubleBonusStreak: number;
  /** Pool of words that were used to create this grid (these are the only findable words). */
  wordPool: string[];
  /** Every word introduced in this match (initial board + refills); used to avoid repeats. */
  usedWords: string[];
  /** Timestamp when current target word was assigned (for per-word timer). */
  wordStartedAt: number;
  /** Gameplay timer budget frozen when the current word started (ms). */
  wordGameplayDurationMs: number;
  /** Whether this player has used their shuffle attack (multiplayer only). */
  shuffleUsed: boolean;
  /** Multiplayer: 2× active — halved timer and double score until a miss ends it. */
  doubleBonusActive: boolean;
  /** Multiplayer: 2× lost after failing to find while 2× was active. */
  doubleBonusUsed: boolean;
  /** Consecutive auto-skips without finding a word; grants extra time, decays by 1 on success. */
  pityTimeouts: number;
  /** Solo only: board refills remaining after correct words. */
  refillsRemaining: number;
  /** Solo only: scales per-word gameplay timer up/down based on solve speed (1 = baseline). */
  soloAdaptiveMultiplier: number;
  /** 1 s overtime ticks already charged at -5 pt each. */
  overtimePenaltyTicks: number;
}

export interface GameState {
  matchStatus: MatchStatus;
  matchMode: MatchMode;
  language: GameLanguage;
  matchStartedAt: number;
  matchDuration: number;
  seed: string;
  soloDifficulty?: SoloDifficulty;
  /** Solo: last word cleared — UI runs victory celebration before END_MATCH. */
  soloVictoryPending?: boolean;
  /** Wall-clock time when solo victory started; freezes the elapsed timer. */
  soloVictoryAt?: number;
  /** Column count for this match's board. */
  gridCols: number;
  /** Row count for this match's board. */
  gridRows: number;
  players: Record<string, PlayerState>;
}

export type GameAction =
  | {
      type: 'START_MATCH';
      seed: string;
      at: number;
      mode: MatchMode;
      language?: GameLanguage;
      difficulty?: SoloDifficulty;
      matchDuration?: number;
    }
  | { type: 'END_MATCH'; at: number }
  | { type: 'RESET' }
  | { type: 'SELECT_LETTER'; playerId: string; letterId: string }
  | { type: 'CLEAR_SELECTION'; playerId: string }
  | { type: 'SUBMIT_WORD'; playerId: string; at: number }
  | { type: 'SKIP_WORD'; playerId: string; at: number }
  | { type: 'WORD_OVERTIME'; playerId: string; at: number; overtimeTicks: number }
  | { type: 'SHUFFLE_BOARD'; playerId: string }
  | { type: 'MARK_SHUFFLE_USED'; playerId: string }
  | { type: 'ACTIVATE_DOUBLE'; playerId: string; at: number }
  /** Dev/testing: jump to solo victory celebration (empty board + pending flag). */
  | { type: 'TRIGGER_SOLO_VICTORY'; playerId: string; at: number }
  /** Dev only: bump word streak for UI testing. */
  | { type: 'DEV_INCREMENT_WORD_STREAK'; playerId: string };
