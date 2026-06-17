import type { RngFn } from './seededRng';
import type { LandedCell, MatchMode, PlayerState, SoloDifficulty } from './types';
import { GRID_COLS, GRID_ROWS, MIN_WORD_LENGTH, MAX_WORD_LENGTH, MAX_EMPTY_CELLS, PITY_TIME_BONUS_PER_TIMEOUT, MAX_PITY_TIMEOUTS, WARMUP_BONUS_MS, SECONDS_PER_LETTER, SOLO_TIME_MULTIPLIER, MULTIPLAYER_TIME_MULTIPLIER, DOUBLE_BONUS_TIME_MULTIPLIER, DOUBLE_BONUS_SCORE_MULTIPLIER, MULTIPLAYER_STREAK_TIME_FACTOR, MULTIPLAYER_STREAK_SCORE_FACTOR, WORD_SCORE, SPEED_BONUS_MAX, MAX_WORD_TIME_MS } from './constants';
import { getWordList, type WordLanguage } from './wordSet';

// ─── Strategic Grid Fill ──────────────────────────────────────────────────────

const WORDS_BY_LENGTH_CACHE: Record<WordLanguage, Record<number, string[]>> = {
  tr: {},
  en: {},
};

function getWordsByLength(language: WordLanguage): Record<number, string[]> {
  const cached = WORDS_BY_LENGTH_CACHE[language];
  if (Object.keys(cached).length > 0) return cached;

  const byLength: Record<number, string[]> = {};
  for (const word of getWordList(language)) {
    if (word.length >= MIN_WORD_LENGTH && word.length <= MAX_WORD_LENGTH) {
      (byLength[word.length] ??= []).push(word);
    }
  }
  WORDS_BY_LENGTH_CACHE[language] = byLength;
  return byLength;
}

function availableWordsOfLength(
  length: number,
  wordsByLength: Record<number, string[]>,
  used: ReadonlySet<string>,
): string[] {
  const pool = wordsByLength[length];
  if (!pool?.length) return [];
  return pool.filter(word => !used.has(word));
}

function pickWordOfLength(
  rng: RngFn,
  length: number,
  wordsByLength: Record<number, string[]>,
  used: ReadonlySet<string>,
): string {
  const available = availableWordsOfLength(length, wordsByLength, used);
  if (!available.length) {
    throw new Error(`No unused words of length ${length} in word list`);
  }
  return available[Math.floor(rng() * available.length)];
}

function pickRandomFittingWord(
  rng: RngFn,
  total: number,
  cap: number,
  wordsByLength: Record<number, string[]>,
  used: ReadonlySet<string>,
): string {
  const maxLen = Math.min(MAX_WORD_LENGTH, cap - total);
  const fittingLengths: number[] = [];
  for (let len = MIN_WORD_LENGTH; len <= maxLen; len++) {
    if (availableWordsOfLength(len, wordsByLength, used).length > 0) {
      fittingLengths.push(len);
    }
  }
  if (fittingLengths.length === 0) {
    throw new Error('No unused fitting words available');
  }
  const length = fittingLengths[Math.floor(rng() * fittingLengths.length)];
  return pickWordOfLength(rng, length, wordsByLength, used);
}

function tryPickOneWord(
  rng: RngFn,
  length: number,
  wordsByLength: Record<number, string[]>,
  used: ReadonlySet<string>,
): string | null {
  const available = availableWordsOfLength(length, wordsByLength, used);
  if (!available.length) return null;
  return available[Math.floor(rng() * available.length)];
}

function tryPickTwoWords(
  rng: RngFn,
  remainder: number,
  wordsByLength: Record<number, string[]>,
  used: ReadonlySet<string>,
): [string, string] | null {
  const firstLengths: number[] = [];
  for (let len = MIN_WORD_LENGTH; len <= Math.min(MAX_WORD_LENGTH, remainder - MIN_WORD_LENGTH); len++) {
    const secondLen = remainder - len;
    if (secondLen >= MIN_WORD_LENGTH && secondLen <= MAX_WORD_LENGTH) {
      firstLengths.push(len);
    }
  }

  for (let i = firstLengths.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [firstLengths[i], firstLengths[j]] = [firstLengths[j], firstLengths[i]];
  }

  for (const firstLen of firstLengths) {
    const secondLen = remainder - firstLen;
    const firstAvailable = availableWordsOfLength(firstLen, wordsByLength, used);
    if (!firstAvailable.length) continue;

    const first = firstAvailable[Math.floor(rng() * firstAvailable.length)];
    const secondAvailable = availableWordsOfLength(secondLen, wordsByLength, new Set([...used, first]));
    if (!secondAvailable.length) continue;

    const second = secondAvailable[Math.floor(rng() * secondAvailable.length)];
    return [first, second];
  }

  return null;
}

/**
 * Builds a word pool whose total letter count equals `targetCells` exactly.
 *
 * Phase 1 — pick random words until total >= target - MAX - MIN (capped so
 *           at least MIN letters remain for closure).
 * Phase 2 — close the gap with one word (remainder <= MAX) or two words
 *           (MIN + remainder - MIN).
 */
function buildWordPool(
  rng: RngFn,
  targetCells: number,
  language: WordLanguage,
  excludeWords: ReadonlySet<string> = new Set(),
): string[] | null {
  const wordsByLength = getWordsByLength(language);
  const used = new Set(excludeWords);
  const threshold = targetCells - MAX_WORD_LENGTH - MIN_WORD_LENGTH;
  const cap = targetCells - MIN_WORD_LENGTH;

  const wordPool: string[] = [];
  let total = 0;

  while (total < threshold) {
    try {
      const word = pickRandomFittingWord(rng, total, cap, wordsByLength, used);
      wordPool.push(word);
      used.add(word);
      total += word.length;
    } catch {
      break;
    }
  }

  if (total === targetCells) return wordPool;

  const remainder = targetCells - total;
  if (remainder === 0) return wordPool;
  if (remainder < MIN_WORD_LENGTH) return null;

  if (remainder <= MAX_WORD_LENGTH) {
    const word = tryPickOneWord(rng, remainder, wordsByLength, used);
    if (word) {
      wordPool.push(word);
      return wordPool;
    }
  }

  if (remainder >= MIN_WORD_LENGTH * 2) {
    const pair = tryPickTwoWords(rng, remainder, wordsByLength, used);
    if (pair) {
      wordPool.push(...pair);
      return wordPool;
    }
  }

  return null;
}

function buildWordPoolWithRetry(
  rng: RngFn,
  targetCells: number,
  language: WordLanguage,
  excludeWords: ReadonlySet<string> = new Set(),
): string[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pool = buildWordPool(rng, targetCells, language, excludeWords);
    if (pool) return pool;
  }
  throw new Error(`Failed to build unique word pool for ${targetCells} cells`);
}

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
 * 1. Pick random words until near-full, then close with exact-length word(s)
 * 2. Decompose words into letters and shuffle them across the grid
 * 3. Return the word pool so gameplay can only ask for these exact words
 *
 * This ensures:
 * - No leftover letters (board multiset equals word pool multiset)
 * - No orphan padding letters outside the word pool
 * - Perfect consumability when every pool word is submitted
 */
export function fillGrid(rng: RngFn, language: WordLanguage = 'tr'): GridGenerationResult {
  const targetCells = GRID_COLS * GRID_ROWS - MAX_EMPTY_CELLS;
  const wordPool = buildWordPoolWithRetry(rng, targetCells, language);
  const letters = Array.from(wordPool.join(''));
  
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

const EN_ALPHABET = Array.from('abcdefghijklmnopqrstuvwxyz');
const TR_ALPHABET = Array.from('abcçdefgğhıijklmnoöprsştuüvyz');

function getVictoryAlphabetLetters(language: WordLanguage): string[] {
  const alphabet = language === 'tr' ? TR_ALPHABET : EN_ALPHABET;
  const cellCount = GRID_COLS * GRID_ROWS;
  return Array.from({ length: cellCount }, (_, i) => alphabet[i % alphabet.length]);
}

/**
 * Fills the board with the alphabet in reading order for the victory celebration.
 */
export function buildVictoryAlphabetGrid(language: WordLanguage = 'tr'): GridGenerationResult {
  const letters = getVictoryAlphabetLetters(language);
  const colHeight = GRID_ROWS - Math.floor(MAX_EMPTY_CELLS / GRID_COLS);
  const columns: LandedCell[][] = [];

  for (let col = 0; col < GRID_COLS; col++) {
    const column: LandedCell[] = [];
    for (let rowFromBottom = 0; rowFromBottom < colHeight; rowFromBottom++) {
      const rowFromTop = GRID_ROWS - 1 - rowFromBottom;
      const index = rowFromTop * GRID_COLS + col;
      column.push({
        id: `victory-c${col}r${rowFromBottom}`,
        letter: letters[index],
      });
    }
    columns.push(column);
  }

  return { columns, wordPool: [] };
}

/** True when every column on the board is empty. */
export function isBoardEmpty(columns: LandedCell[][]): boolean {
  return columns.every(col => col.length === 0);
}

function columnCapacity(): number {
  return GRID_ROWS - Math.floor(MAX_EMPTY_CELLS / GRID_COLS);
}

/**
 * After cleared letters collapse, fill every empty slot with letters from new
 * words and return those words for the question pool.
 */
export function refillEmptySlots(
  rng: RngFn,
  columns: LandedCell[][],
  idSeed: string,
  language: WordLanguage = 'tr',
  excludeWords: ReadonlySet<string> = new Set(),
): { columns: LandedCell[][]; words: string[] } | null {
  const colHeight = columnCapacity();
  const totalEmpty = columns.reduce((sum, col) => sum + (colHeight - col.length), 0);
  if (totalEmpty < MIN_WORD_LENGTH) return null;

  const words = buildWordPool(rng, totalEmpty, language, excludeWords);
  if (!words) return null;
  const letters = Array.from(words.join(''));

  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  const newColumns = columns.map(col => [...col]);
  let placed = 0;

  while (placed < letters.length) {
    const available = newColumns
      .map((col, idx) => ({ idx, space: colHeight - col.length }))
      .filter(c => c.space > 0);
    if (available.length === 0) return null;

    const pick = available[Math.floor(rng() * available.length)];
    const row = newColumns[pick.idx].length;
    newColumns[pick.idx].push({
      id: `${idSeed}-c${pick.idx}r${row}`,
      letter: letters[placed],
    });
    placed++;
  }

  return { columns: newColumns, words };
}

export function getCellById(columns: LandedCell[][], letterId: string): LandedCell | null {
  for (const col of columns) {
    for (const cell of col) {
      if (cell.id === letterId) return cell;
    }
  }
  return null;
}

/** Whether `letter` is the next expected character in `targetWord`. */
export function isCorrectNextLetter(
  targetWord: string,
  selectedCount: number,
  letter: string,
): boolean {
  const expected = Array.from(targetWord)[selectedCount];
  if (!expected) return false;
  return letter === expected;
}

/** First unselected cell on the board matching the next letter in `targetWord`. */
export function findHintCellId(
  columns: LandedCell[][],
  targetWord: string,
  selectedIds: string[],
): string | null {
  const expected = Array.from(targetWord)[selectedIds.length];
  if (!expected) return null;

  const selectedSet = new Set(selectedIds);
  for (const col of columns) {
    for (const cell of col) {
      if (!selectedSet.has(cell.id) && cell.letter === expected) {
        return cell.id;
      }
    }
  }
  return null;
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
 *
 * Strategy: Only select from the pre-determined word pool (words used to create grid),
 * uniformly at random among spellable candidates.
 */
export function pickTargetWord(
  rng: RngFn,
  columns: LandedCell[][],
  wordPool: string[],
): string | null {
  if (wordPool.length === 0) return null;

  const freq = buildLetterFreqMap(columns);
  const spellableWords = wordPool.filter(word => canSpell(word, freq));

  if (spellableWords.length === 0) return null;

  const index = Math.floor(rng() * spellableWords.length);
  return spellableWords[index];
}

// ─── Word Timer Calculation ───────────────────────────────────────────────────

/**
 * Average inverse board count for letters in the word.
 * 1 copy on board → 1.0 (hard), many copies → lower (easier).
 * Uses only the current grid, not language-wide frequencies.
 */
export function calculateWordLetterScarcity(word: string, columns: LandedCell[][]): number {
  if (!word) return 1;
  const freq = buildLetterFreqMap(columns);
  let scarcitySum = 0;
  for (const ch of word) {
    const boardCount = freq.get(ch) ?? 0;
    scarcitySum += 1 / Math.max(boardCount, 1);
  }
  return scarcitySum / word.length;
}

/**
 * Maps board-relative letter scarcity to a time multiplier.
 * Scarce letters (few copies on board) → more time, up to +15%.
 * Abundant letters → less time, down to -10%.
 */
export function letterFrequencyMultiplier(scarcity: number): number {
  // scarcity is typically 0.07 (letter appears ~14×) … 1.0 (appears once)
  return Math.min(1.15, Math.max(0.9, 0.85 + 0.25 * scarcity));
}

/** Maps board letter scarcity to a score multiplier — rarer letters earn more. */
export function wordScarcityScoreMultiplier(scarcity: number): number {
  return Math.min(1.5, Math.max(1, 1 + 0.5 * scarcity));
}

/**
 * Extra time after consecutive auto-skips. Resets when the player finds a word.
 */
export function pityTimeMultiplier(pityTimeouts: number): number {
  const stacks = Math.min(Math.max(0, pityTimeouts), MAX_PITY_TIMEOUTS);
  return 1 + stacks * PITY_TIME_BONUS_PER_TIMEOUT;
}

/** Flat bonus ms for early words (1st +2s, 2nd +1s, 3rd +0.5s). */
export function warmupTimeBonusMs(wordsCompleted: number): number {
  return WARMUP_BONUS_MS[wordsCompleted] ?? 0;
}

/**
 * Calculate word duration in milliseconds based on word length, board density,
 * and letter scarcity on the board.
 *
 * @param applyPity When true (default), pity stacks and warm-up bonus extend the timer.
 *   When false, returns the fair baseline used for speed-bonus scoring.
 */
export function calculateWordDuration(
  word: string,
  columns: LandedCell[][],
  secondsPerLetter: number,
  pityTimeouts = 0,
  applyPity = true,
  wordsCompleted = 0,
  timeMultiplier = 1,
): number {
  const wordLength = word.length;
  if (wordLength === 0) return 0;

  const maxCells = GRID_COLS * GRID_ROWS;
  const currentLetters = columns.reduce((sum, col) => sum + col.length, 0);
  const boardDensity = currentLetters / maxCells;

  const densityMultiplier = 1.0 + 1.2 * boardDensity;
  const scarcity = calculateWordLetterScarcity(word, columns);
  const freqMultiplier = letterFrequencyMultiplier(scarcity);
  const pityMultiplier = applyPity ? pityTimeMultiplier(pityTimeouts) : 1;

  const calculated =
    wordLength * secondsPerLetter * densityMultiplier * freqMultiplier * pityMultiplier * 1000;
  const minDuration = wordLength * 0.8 * secondsPerLetter * 1000;

  let duration = Math.max(calculated, minDuration);
  if (applyPity) {
    duration += warmupTimeBonusMs(wordsCompleted);
    duration *= timeMultiplier;
  }
  return duration;
}

/** Compound 2× timer shrink from consecutive finds while active (0.9^streak). */
export function doubleBonusStreakTimeMultiplier(streak: number): number {
  return Math.pow(MULTIPLAYER_STREAK_TIME_FACTOR, streak);
}

/** Compound 2× score growth from consecutive finds while active (1.1^streak). */
export function doubleBonusStreakScoreMultiplier(streak: number): number {
  return Math.pow(MULTIPLAYER_STREAK_SCORE_FACTOR, streak);
}

/** Score multiplier for the current word while 2× is active. */
export function getDoubleScoreMultiplier(player: PlayerState): number {
  if (!player.doubleBonusActive) return 1;
  return DOUBLE_BONUS_SCORE_MULTIPLIER * doubleBonusStreakScoreMultiplier(player.doubleBonusStreak);
}

/** @deprecated Use getDoubleScoreMultiplier */
export function getMultiplayerScoreMultiplier(player: PlayerState): number {
  return getDoubleScoreMultiplier(player);
}

export interface WordScoreInput {
  word: string;
  columns: LandedCell[][];
  submittedAt: number;
  wordStartedAt: number;
  matchMode: MatchMode;
  player: PlayerState;
  soloDifficulty?: SoloDifficulty;
}

export interface WordScoreBreakdown {
  base: number;
  scarcityMultiplier: number;
  timerMultiplier: number;
  total: number;
}

/**
 * Points for one correct word — word length, letter scarcity, and timer pressure.
 * Difficulty and 2× affect score only through allotted per-word time.
 */
export function computeWordPoints(input: WordScoreInput): WordScoreBreakdown {
  const { word, columns, submittedAt, wordStartedAt, matchMode, player, soloDifficulty } = input;
  const base = WORD_SCORE[word.length] ?? 1;

  const scarcity = calculateWordLetterScarcity(word, columns);
  const scarcityMultiplier = wordScarcityScoreMultiplier(scarcity);

  const allowedMs = getPlayerWordDuration(player, matchMode, soloDifficulty);
  const elapsedMs = Math.max(0, submittedAt - wordStartedAt);
  const timerMultiplier = wordTimerScoreMultiplier(allowedMs, elapsedMs);

  const total = Math.round(base * scarcityMultiplier * timerMultiplier);

  return { base, scarcityMultiplier, timerMultiplier, total };
}

/** Label for the 2× button while active, e.g. "2.0×", "2.2×". */
export function formatDoubleBonusMultiplierLabel(streak: number): string {
  const value = DOUBLE_BONUS_SCORE_MULTIPLIER * doubleBonusStreakScoreMultiplier(streak);
  return `${value.toFixed(1)}×`;
}

/** Per-word timer for gameplay, including multiplayer streak and 2× when active. */
export function getPlayerWordDuration(
  player: PlayerState,
  matchMode: MatchMode,
  soloDifficulty?: SoloDifficulty,
): number {
  if (!player.targetWord) return 0;

  const timeMultiplier =
    matchMode === 'solo'
      ? SOLO_TIME_MULTIPLIER[soloDifficulty ?? 'hard']
      : MULTIPLAYER_TIME_MULTIPLIER;

  let duration = calculateWordDuration(
    player.targetWord,
    player.columns,
    SECONDS_PER_LETTER,
    player.pityTimeouts,
    true,
    player.wordsCompleted,
    timeMultiplier,
  );

  if (player.doubleBonusActive) {
    duration *= DOUBLE_BONUS_TIME_MULTIPLIER;
    duration *= doubleBonusStreakTimeMultiplier(player.doubleBonusStreak);
  }

  return duration;
}

/**
 * Score factor from allotted time and solve speed only.
 * Halving allowed time doubles the score; speed is measured against the 60s cap.
 */
export function wordTimerScoreMultiplier(allowedMs: number, elapsedMs: number): number {
  if (allowedMs <= 0) return 1;

  const allowed = Math.min(allowedMs, MAX_WORD_TIME_MS);
  const elapsed = Math.min(Math.max(0, elapsedMs), MAX_WORD_TIME_MS);

  const pressureRatio = MAX_WORD_TIME_MS / allowed;
  const speedFactor = (MAX_WORD_TIME_MS - elapsed) / MAX_WORD_TIME_MS;

  return pressureRatio * (1 + speedFactor * SPEED_BONUS_MAX);
}
