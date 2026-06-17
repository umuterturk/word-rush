export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 8;
/** Selection cap = max word length. */
export const MAX_BUFFER_SIZE = MAX_WORD_LENGTH;

import type { SoloDifficulty } from './types';

export const MATCH_DURATION_MS = 120_000;

/** Solo: board refills allowed after correct words. */
export const SOLO_REFILL_LIMIT = 10;

/** Solo per-word timer multiplier by difficulty. */
export const SOLO_TIME_MULTIPLIER: Readonly<Record<SoloDifficulty, number>> = {
  easy: 4,
  normal: 2,
  hard: 1,
};

/** Multiplayer uses normal-mode per-word timer. */
export const MULTIPLAYER_TIME_MULTIPLIER = SOLO_TIME_MULTIPLIER.normal;

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

/** Seconds per letter for word timer. */
export const SECONDS_PER_LETTER = 1.2;

/** Auto-skip word when timer expires. */
export const AUTO_SKIP_ON_TIMEOUT = true;

/** Delay before highlighting the next correct letter on the board. */
export const LETTER_HINT_DELAY_MS = 5_000;

/** Extra time per consecutive auto-skip (+15% each, decays by 1 on success). */
export const PITY_TIME_BONUS_PER_TIMEOUT = 0.2;

/** Cap pity stacks so bonus does not grow without bound. */
export const MAX_PITY_TIMEOUTS = 4;

/** Flat extra seconds for the first words of a match (timer only). */
export const WARMUP_BONUS_MS = [3_500, 2_500, 1_500] as const;

/**
 * Words completed before target-word length bias fully fades (gameplay only).
 * Shorter words stay much more likely early; weights equalize after this many finds/skips.
 */
export const TARGET_WORD_LENGTH_RAMP = 12;

/** Maximum number of empty cells allowed during gameplay. */
export const MAX_EMPTY_CELLS = 0;

// ─── Grid layout ──────────────────────────────────────────────────────────────
export const GRID_COLS = 5;
export const GRID_ROWS = 7;
