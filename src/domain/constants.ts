export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 8;
/** Selection cap = max word length. */
export const MAX_BUFFER_SIZE = MAX_WORD_LENGTH;

export const MATCH_DURATION_MS = 120_000;

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
export const SKIP_PENALTY = 2;

// ─── Grid layout ──────────────────────────────────────────────────────────────
export const GRID_COLS = 7;
export const GRID_ROWS = 9;
