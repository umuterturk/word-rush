import type { RngFn } from './seededRng';
import type { LandedCell } from './types';
import { GRID_COLS, GRID_ROWS, MIN_WORD_LENGTH, MAX_EMPTY_CELLS } from './constants';
import { WORD_LIST } from './wordSet';

// ─── Strategic Grid Fill ──────────────────────────────────────────────────────

/**
 * Result of grid generation: the filled grid and the word pool that created it.
 */
export interface GridGenerationResult {
  columns: LandedCell[][];
  wordPool: string[];
}

/**
 * Creates a grid by picking random words whose total letters equal the target cell count.
 * Returns both the grid and the word pool - only these words can be found during gameplay.
 * 
 * Strategy:
 * 1. Pick random words until total letters = GRID_COLS × GRID_ROWS - MAX_EMPTY_CELLS
 * 2. Decompose words into letters and shuffle them across the grid
 * 3. Return the word pool so gameplay can only ask for these exact words
 * 
 * This ensures:
 * - No leftover letters (all letters are from the word pool)
 * - No "no more words" situation (we know exactly which words exist)
 * - Perfect consumability (all letters will be used when words are found)
 */
export function fillGrid(rng: RngFn): GridGenerationResult {
  const targetCells = GRID_COLS * GRID_ROWS - MAX_EMPTY_CELLS;
  
  // Filter word list to preferred lengths (3-6 for better variety)
  const suitableWords = WORD_LIST.filter(w => 
    w.length >= MIN_WORD_LENGTH && w.length <= 6
  );
  
  // Pick words until we reach exactly targetCells letters
  const wordPool: string[] = [];
  const letters: string[] = [];
  let attempts = 0;
  const maxAttempts = 1000;
  
  while (letters.length < targetCells && attempts < maxAttempts) {
    attempts++;
    const wordIdx = Math.floor(rng() * suitableWords.length);
    const word = suitableWords[wordIdx];
    
    // Would this word fit?
    if (letters.length + word.length <= targetCells) {
      wordPool.push(word);
      for (const letter of word) {
        letters.push(letter);
      }
    } else if (letters.length < targetCells) {
      // We're close to target - try to find a word that fits exactly
      const remaining = targetCells - letters.length;
      const exactFit = suitableWords.find(w => w.length === remaining);
      if (exactFit) {
        wordPool.push(exactFit);
        for (const letter of exactFit) {
          letters.push(letter);
        }
        break;
      }
    }
  }
  
  // If we couldn't fill exactly, pad or trim
  while (letters.length < targetCells) {
    // Pick a single-letter word or just add a common letter
    letters.push(['a', 'e', 'i', 'o'][Math.floor(rng() * 4)]);
  }
  if (letters.length > targetCells) {
    letters.length = targetCells;
  }
  
  // Shuffle letters for random distribution
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  
  // Create grid columns and fill with letters
  const columns: LandedCell[][] = [];
  let letterIdx = 0;
  
  for (let col = 0; col < GRID_COLS; col++) {
    const column: LandedCell[] = [];
    const colHeight = GRID_ROWS - Math.floor(MAX_EMPTY_CELLS / GRID_COLS);
    
    for (let row = 0; row < colHeight; row++) {
      if (letterIdx < letters.length) {
        column.push({
          id: `c${col}r${row}`,
          letter: letters[letterIdx],
        });
        letterIdx++;
      }
    }
    
    columns.push(column);
  }
  
  return { columns, wordPool };
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
 * Picks a random valid word from the word pool that can be spelled from the
 * letters currently in the grid. Returns `null` if no such word exists.
 *
 * @param rng Random number generator
 * @param columns Current grid state
 * @param wordPool Pool of words that were used to create this grid
 * @param wordsCompleted Number of words completed (for difficulty scaling)
 *
 * Strategy: Only select from the pre-determined word pool (words used to create grid).
 * Early game (first 5 words) favors shorter words from the pool.
 */
export function pickTargetWord(
  rng: RngFn,
  columns: LandedCell[][],
  wordPool: string[],
  wordsCompleted = 0,
): string | null {
  if (wordPool.length === 0) return null;
  
  const freq = buildLetterFreqMap(columns);

  // Calculate bias: first 5 words strongly favor length 3, then gradually flatten
  const shortBias = Math.max(0, 5 - wordsCompleted);
  
  // Filter word pool to only words that can be spelled
  const spellableWords = wordPool.filter(word => canSpell(word, freq));
  
  if (spellableWords.length === 0) return null;
  
  // Weight by length preference
  const weighted: Array<{ word: string; weight: number }> = spellableWords.map(word => {
    let weight = 1;
    if (word.length === 3) {
      weight += shortBias * 3;
    }
    return { word, weight };
  });
  
  // Weighted random selection
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  const r = rng() * totalWeight;
  let cumulative = 0;
  
  for (const { word, weight } of weighted) {
    cumulative += weight;
    if (r < cumulative) {
      return word;
    }
  }
  
  return weighted[weighted.length - 1].word;
}
