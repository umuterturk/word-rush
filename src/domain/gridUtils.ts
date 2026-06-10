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
 * @param rng Random number generator
 * @param columns Current grid state
 * @param wordsCompleted Number of words completed (for difficulty scaling)
 *
 * Strategy: Early game (first 5 words) heavily favors 3-letter words.
 * After that, probability gradually evens out across all lengths.
 */
export function pickTargetWord(
  rng: RngFn,
  columns: LandedCell[][],
  wordsCompleted = 0,
): string | null {
  const freq = buildLetterFreqMap(columns);

  // Calculate bias: first 5 words strongly favor length 3, then gradually flatten
  const shortBias = Math.max(0, 5 - wordsCompleted);
  
  // Filter and weight candidates by length
  const weightedCandidates: Array<{ word: string; weight: number }> = [];
  
  for (const word of WORD_LIST) {
    if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) continue;
    
    // Base weight = 1, but 3-letter words get bonus during early game
    let weight = 1;
    if (word.length === 3) {
      weight += shortBias * 3; // 3-letter words 3x more likely per remaining bias point
    }
    
    weightedCandidates.push({ word, weight });
  }

  if (weightedCandidates.length === 0) return null;

  // Weighted shuffle: pick items proportional to their weight
  const shuffled: string[] = [];
  
  const remaining = [...weightedCandidates];
  while (remaining.length > 0 && shuffled.length < 100) {
    const r = rng() * remaining.reduce((sum, c) => sum + c.weight, 0);
    let cumulative = 0;
    let picked = 0;
    
    for (let i = 0; i < remaining.length; i++) {
      cumulative += remaining[i].weight;
      if (r < cumulative) {
        picked = i;
        break;
      }
    }
    
    shuffled.push(remaining[picked].word);
    remaining.splice(picked, 1);
  }

  // Return first word that can be spelled
  for (const word of shuffled) {
    if (canSpell(word, freq)) return word;
  }

  return null;
}
