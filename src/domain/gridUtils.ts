import type { RngFn } from './seededRng';
import type { LandedCell } from './types';
import { GRID_COLS, GRID_ROWS, MIN_WORD_LENGTH, MAX_WORD_LENGTH } from './constants';
import { LETTER_FREQUENCIES, WORD_LIST } from './wordSet';

// ─── Letter sampling ──────────────────────────────────────────────────────────

/** Cumulative distribution table built once from LETTER_FREQUENCIES. */
const CDF: Array<{ letter: string; cum: number }> = (() => {
  const entries = Object.entries(LETTER_FREQUENCIES).sort((a, b) => a[0].localeCompare(b[0]));
  let cum = 0;
  return entries.map(([letter, freq]) => {
    cum += freq;
    return { letter, cum };
  });
})();

function sampleLetter(rng: RngFn): string {
  const r = rng();
  for (const { letter, cum } of CDF) {
    if (r < cum) return letter;
  }
  return CDF[CDF.length - 1].letter;
}

// ─── Grid fill ────────────────────────────────────────────────────────────────

/**
 * Creates a fully filled GRID_COLS × GRID_ROWS grid of random letters.
 * Cell IDs are positional: `c{col}r{row}` where row 0 = top of column display
 * (but stored bottom-first: index 0 = bottom).
 *
 * Layout stored as `columns[col][rowIndex]` where rowIndex 0 = bottom row.
 */
export function fillGrid(rng: RngFn): LandedCell[][] {
  return Array.from({ length: GRID_COLS }, (_, col) =>
    Array.from({ length: GRID_ROWS }, (_, rowFromBottom) => ({
      id: `c${col}r${rowFromBottom}`,
      letter: sampleLetter(rng),
    })),
  );
}

// ─── Word picking ─────────────────────────────────────────────────────────────

/**
 * Builds a letter → count map from all non-empty cells in the grid.
 */
export function buildLetterFreqMap(columns: LandedCell[][]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const col of columns) {
    for (const cell of col) {
      freq.set(cell.letter, (freq.get(cell.letter) ?? 0) + 1);
    }
  }
  return freq;
}

/**
 * Returns true if `word` can be spelled using the letters available in `freq`
 * (multiset check — each letter consumed once).
 */
function canSpell(word: string, freq: Map<string, number>): boolean {
  const needed = new Map<string, number>();
  for (const ch of word) {
    needed.set(ch, (needed.get(ch) ?? 0) + 1);
  }
  for (const [ch, count] of needed) {
    if ((freq.get(ch) ?? 0) < count) return false;
  }
  return true;
}

/**
 * Picks a random valid word from the word list that can be spelled from the
 * letters currently in the grid. Returns `null` if no such word exists.
 *
 * Strategy: shuffle a random sample of candidate words (filtered by length),
 * then return the first one that passes the multiset check.
 */
export function pickTargetWord(rng: RngFn, columns: LandedCell[][]): string | null {
  const freq = buildLetterFreqMap(columns);

  // Filter to words of the desired length range
  const candidates = WORD_LIST.filter(
    w => w.length >= MIN_WORD_LENGTH && w.length <= MAX_WORD_LENGTH,
  );

  if (candidates.length === 0) return null;

  // Fisher-Yates shuffle a copy, then pick the first valid word
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (const word of shuffled) {
    if (canSpell(word, freq)) return word;
  }

  return null;
}
