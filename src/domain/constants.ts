/** Number of players shown on weekly and all-time leaderboards. */
export const LEADERBOARD_TOP_COUNT = 10;

/** Today's top scores preview shown on the home screen. */
export const LEADERBOARD_HOME_PREVIEW_COUNT = 3;

export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 8;
/** Selection cap = max word length. */
export const MAX_BUFFER_SIZE = MAX_WORD_LENGTH;

import type { MatchMode, SoloDifficulty } from './types';

/** True in the Vite dev server — not during unit tests (MODE=test) or production builds. */
export const IS_DEV_GAMEPLAY = import.meta.env.MODE === 'development';

export const MATCH_DURATION_MS = 120_000;

/** Shorter multiplayer rounds in dev for faster iteration. */
export const MULTIPLAYER_MATCH_DURATION_MS = IS_DEV_GAMEPLAY ? 30_000 : MATCH_DURATION_MS;

/** Solo: board refills allowed after correct words. */
export const SOLO_REFILL_LIMIT = 10;

/** Dev solo: no refills — clear the initial board only. */
const DEV_SOLO_REFILL_LIMIT = 0;

/** Dev solo: short overall timer so matches end quickly even if the board isn't cleared. */
const DEV_SOLO_MATCH_DURATION_MS = 30_000;

export function getSoloMatchDurationMs(): number {
  return IS_DEV_GAMEPLAY ? DEV_SOLO_MATCH_DURATION_MS : MATCH_DURATION_MS;
}

export function getSoloRefillLimit(): number {
  return IS_DEV_GAMEPLAY ? DEV_SOLO_REFILL_LIMIT : SOLO_REFILL_LIMIT;
}

export interface GridDimensions {
  cols: number;
  rows: number;
}

/** Solo grid size by difficulty — more rows = harder board, same per-word timer. */
export const SOLO_GRID_BY_DIFFICULTY: Readonly<Record<SoloDifficulty, GridDimensions>> = {
  easy: { cols: 5, rows: 5 },
  normal: { cols: 5, rows: 6 },
  hard: { cols: 5, rows: 7 },
};

/** Multiplayer uses the normal solo grid. */
export const MULTIPLAYER_GRID: GridDimensions = SOLO_GRID_BY_DIFFICULTY.normal;

export function getMatchGridDimensions(
  matchMode: MatchMode,
  soloDifficulty?: SoloDifficulty,
): GridDimensions {
  if (matchMode === 'solo') {
    if (IS_DEV_GAMEPLAY) {
      return SOLO_GRID_BY_DIFFICULTY.easy;
    }
    return SOLO_GRID_BY_DIFFICULTY[soloDifficulty ?? 'hard'];
  }
  return MULTIPLAYER_GRID;
}

/** Per-word timer multiplier — identical across solo difficulties; adaptive handles pacing. */
export const SOLO_TIME_MULTIPLIER = 1;

/** Multiplayer uses the same per-word timer baseline as solo. */
export const MULTIPLAYER_TIME_MULTIPLIER = SOLO_TIME_MULTIPLIER;

/** Adaptive timer bounds — relative to the base per-word timer. */
export const SOLO_ADAPTIVE_MIN = 0.35;
export const SOLO_ADAPTIVE_MAX = 1.25;

/** Used-time bands for per-word adaptive step (fraction of allotted time). */
export const SOLO_ADAPT_USED_FAST_MAX = 0.1;
export const SOLO_ADAPT_USED_NEUTRAL_MIN = 0.8;
export const SOLO_ADAPT_USED_NEUTRAL_MAX = 0.9;
export const SOLO_ADAPT_USED_SLOW_MIN = 0.9;

/** Per-word step factor at the fast/slow extremes (multiplicative). */
export const SOLO_ADAPT_STEP_FAST = 0.5;
export const SOLO_ADAPT_STEP_SLOW = 1.2;

/** Multiplayer 2× power-up: halves per-word timer. */
export const DOUBLE_BONUS_TIME_MULTIPLIER = 0.5;

/** Multiplayer 2× power-up: doubles points on the activated word. */
export const DOUBLE_BONUS_SCORE_MULTIPLIER = 2;

/** 2× mode: per consecutive find while active, timer shrinks 10% (compound). */
export const MULTIPLAYER_STREAK_TIME_FACTOR = 0.9;

/** 2× mode: per consecutive find while active, score grows 10% (compound). */
export const MULTIPLAYER_STREAK_SCORE_FACTOR = 1.1;

/**
 * Speed bonus scale — tuned so hard (15s) ≈ 10 pts and hard 2× (7.5s) ≈ 20 pts
 * for a 4-letter word solved in 5s.
 */
export const SPEED_BONUS_MAX = 3 / 11;

/** Reference cap for per-word timer scoring — longer allowed clocks score less. */
export const MAX_WORD_TIME_MS = 60_000;

/** Points awarded per word length. */
export const WORD_SCORE: Readonly<Record<number, number>> = {
  3: 1,
  4: 2,
  5: 4,
  6: 7,
  7: 11,
  8: 16,
};

/** Penalty for skipping a word. */
export const SKIP_PENALTY = 0;

/** Ms between each -1 point tick after the per-word timer expires. */
export const WORD_OVERTIME_PENALTY_TICK_MS = 200;

/** Points deducted on each overtime tick. */
export const WORD_OVERTIME_PENALTY_PER_TICK = 1;

/** Seconds per letter for word timer. */
export const SECONDS_PER_LETTER = 1.2;

/** Delay before highlighting the next correct letter on the board. */
export const LETTER_HINT_DELAY_MS = 5_000;

/** Extra time per consecutive auto-skip (+15% each, decays by 1 on success). */
export const PITY_TIME_BONUS_PER_TIMEOUT = 0.2;

/** Cap pity stacks so bonus does not grow without bound. */
export const MAX_PITY_TIMEOUTS = 4;

/** Flat extra seconds for the first words of a match (timer only). */
export const WARMUP_BONUS_MS = [3_500, 2_500, 1_500] as const;
/** Maximum number of empty cells allowed during gameplay. */
export const MAX_EMPTY_CELLS = 0;

/** Default grid for tests and idle state — normal solo size. */
export const DEFAULT_GRID: GridDimensions = SOLO_GRID_BY_DIFFICULTY.normal;

/** @deprecated Use getMatchGridDimensions or DEFAULT_GRID */
export const GRID_COLS = DEFAULT_GRID.cols;
/** @deprecated Use getMatchGridDimensions or DEFAULT_GRID */
export const GRID_ROWS = DEFAULT_GRID.rows;
