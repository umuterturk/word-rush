import type { RngFn } from './seededRng';
import type { LandedCell } from './types';
import { GRID_COLS, GRID_ROWS, MIN_WORD_LENGTH, MAX_WORD_LENGTH, MAX_EMPTY_CELLS } from './constants';
import { WORD_LIST } from './wordSet';

// ─── Strategic Grid Fill ──────────────────────────────────────────────────────

/**
 * Creates a grid strategically filled with letters from actual words.
 * Ensures all letters can form valid words and allows up to MAX_EMPTY_CELLS empty spots.
 * 
 * Strategy:
 * 1. Pick random words from the word list
 * 2. Decompose them into letters and scatter across grid
 * 3. Fill remaining spots with letters that complement existing ones
 * 4. Leave MAX_EMPTY_CELLS spots initially empty for gameplay dynamics
 */
export function fillGrid(rng: RngFn): LandedCell[][] {
  const totalCells = GRID_COLS * GRID_ROWS;
  const targetFilled = totalCells - MAX_EMPTY_CELLS;
  
  // Filter word list to preferred lengths (3-6 for better decomposition)
  const suitableWords = WORD_LIST.filter(w => w.length >= 3 && w.length <= 6);
  
  // Collect letters from random words until we have enough
  const letters: string[] = [];
  const usedWords = new Set<string>();
  
  while (letters.length < targetFilled) {
    const wordIdx = Math.floor(rng() * suitableWords.length);
    const word = suitableWords[wordIdx];
    
    // Avoid using the same word too many times
    if (usedWords.size > 20 && usedWords.has(word)) continue;
    usedWords.add(word);
    
    // Add letters from this word
    for (const letter of word) {
      if (letters.length < targetFilled) {
        letters.push(letter);
      }
    }
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
    const colHeight = GRID_ROWS;
    
    for (let row = 0; row < colHeight; row++) {
      if (letterIdx < letters.length) {
        column.push({
          id: `c${col}r${row}`,
          letter: letters[letterIdx],
        });
        letterIdx++;
      }
      // Remaining cells stay empty (handled by not adding them)
    }
    
    columns.push(column);
  }
  
  return columns;
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
