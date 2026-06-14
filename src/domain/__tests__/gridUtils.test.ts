import { describe, it, expect } from 'vitest';
import { createSeededRng } from '../seededRng';
import { fillGrid, pickTargetWord, buildLetterFreqMap, calculateWordDuration, calculateWordLetterScarcity, letterFrequencyMultiplier, pityTimeMultiplier, findHintCellId, targetWordSelectionWeight, refillEmptySlots, getPlayerWordDuration, doubleBonusStreakTimeMultiplier, doubleBonusStreakScoreMultiplier, getMultiplayerScoreMultiplier, formatDoubleBonusMultiplierLabel } from '../gridUtils';
import { GRID_COLS, GRID_ROWS, SECONDS_PER_LETTER, WARMUP_BONUS_MS, TARGET_WORD_LENGTH_RAMP, DOUBLE_BONUS_SCORE_MULTIPLIER } from '../constants';
import { createInitialPlayerState } from '../gameReducer';

describe('fillGrid', () => {
  it('creates exactly GRID_COLS columns', () => {
    const rng = createSeededRng('test');
    const { columns } = fillGrid(rng);
    expect(columns).toHaveLength(GRID_COLS);
  });

  it('returns word pool and columns', () => {
    const rng = createSeededRng('pool');
    const result = fillGrid(rng);
    expect(result.columns).toBeDefined();
    expect(result.wordPool).toBeDefined();
    expect(Array.isArray(result.wordPool)).toBe(true);
    expect(result.wordPool.length).toBeGreaterThan(0);
  });

  it('fills the board exactly from the word pool with no orphan letters', () => {
    const rng = createSeededRng('strategic');
    const { columns, wordPool } = fillGrid(rng);

    const targetCells = GRID_COLS * GRID_ROWS;
    const totalCells = columns.reduce((sum, col) => sum + col.length, 0);
    const poolLetters = wordPool.join('');
    const boardLetters = columns.flat().map(c => c.letter).join('');

    expect(totalCells).toBe(targetCells);
    expect(poolLetters.length).toBe(targetCells);
    expect([...poolLetters].sort().join('')).toBe([...boardLetters].sort().join(''));
  });

  it('word pool sums to board size across many seeds', () => {
    const targetCells = GRID_COLS * GRID_ROWS;
    for (let i = 0; i < 200; i++) {
      const { columns, wordPool } = fillGrid(createSeededRng(`fill-${i}`));
      const poolSum = wordPool.reduce((sum, w) => sum + w.length, 0);
      const boardCells = columns.reduce((sum, col) => sum + col.length, 0);
      expect(poolSum).toBe(targetCells);
      expect(boardCells).toBe(targetCells);
    }
  });

  it('all cell IDs are unique', () => {
    const rng = createSeededRng('unique');
    const { columns } = fillGrid(rng);
    const ids = columns.flat().map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all cells have lowercase Turkish letters', () => {
    const rng = createSeededRng('letters');
    const { columns } = fillGrid(rng);
    
    for (const col of columns) {
      for (const cell of col) {
        expect(cell.letter).toMatch(/^[a-zçğıöşü]$/);
        expect(Array.from(cell.letter)).toHaveLength(1);
      }
    }
  });

  it('is deterministic for same seed', () => {
    const result1 = fillGrid(createSeededRng('same'));
    const result2 = fillGrid(createSeededRng('same'));
    
    expect(result1.columns.flat().map(c => c.letter).join('')).toBe(
      result2.columns.flat().map(c => c.letter).join('')
    );
    expect(result1.wordPool).toEqual(result2.wordPool);
  });
});

describe('refillEmptySlots', () => {
  it('fills every empty slot on an otherwise empty board', () => {
    const columns = Array.from({ length: GRID_COLS }, () => [] as { id: string; letter: string }[]);
    const result = refillEmptySlots(createSeededRng('refill-empty'), columns, 'test');
    expect(result).not.toBeNull();
    if (!result) return;

    const totalCells = result.columns.reduce((sum, col) => sum + col.length, 0);
    expect(totalCells).toBe(GRID_COLS * GRID_ROWS);
    const poolLetters = result.words.join('');
    const boardLetters = result.columns.flat().map(c => c.letter).join('');
    expect(poolLetters.length).toBe(GRID_COLS * GRID_ROWS);
    expect([...poolLetters].sort().join('')).toBe([...boardLetters].sort().join(''));
  });

  it('fills all gaps after partial removal', () => {
    const columns = [
      [{ id: 'a', letter: 'a' }],
      [{ id: 'b', letter: 'b' }, { id: 'c', letter: 'c' }],
      [],
      [],
      [],
    ];
    const before = columns.reduce((sum, col) => sum + col.length, 0);
    const emptyBefore = GRID_COLS * GRID_ROWS - before;
    const result = refillEmptySlots(createSeededRng('refill-partial'), columns, 'test');
    expect(result).not.toBeNull();
    if (!result) return;

    const after = result.columns.reduce((sum, col) => sum + col.length, 0);
    expect(after).toBe(GRID_COLS * GRID_ROWS);
    expect(result.words.join('').length).toBe(emptyBefore);
  });

  it('keeps the board full across many simulated word finds', () => {
    for (let seed = 0; seed < 20; seed++) {
      const rng = createSeededRng(`sim-${seed}`);
      let { columns, wordPool } = fillGrid(rng);
      let wordsCompleted = 0;

      for (let round = 0; round < 12; round++) {
        const target = pickTargetWord(
          createSeededRng(`pick-${seed}-${round}`),
          columns,
          wordPool,
          wordsCompleted,
        );
        if (!target) break;

        const ids: string[] = [];
        const used = new Set<string>();
        for (const ch of target) {
          let found = false;
          for (const col of columns) {
            for (const cell of col) {
              if (cell.letter === ch && !used.has(cell.id)) {
                ids.push(cell.id);
                used.add(cell.id);
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
        expect(ids).toHaveLength(target.length);

        const clearSet = new Set(ids);
        columns = columns.map(col => col.filter(c => !clearSet.has(c.id)));
        wordPool = wordPool.filter(w => w !== target);
        wordsCompleted++;

        const refill = refillEmptySlots(
          createSeededRng(`refill-${seed}-${wordsCompleted}`),
          columns,
          `inj${wordsCompleted}`,
        );
        expect(refill).not.toBeNull();
        if (!refill) break;
        columns = refill.columns;
        wordPool.push(...refill.words);

        const totalCells = columns.reduce((sum, col) => sum + col.length, 0);
        expect(totalCells).toBe(GRID_COLS * GRID_ROWS);
      }
    }
  });

  it('returns null when there is not enough room for a word', () => {
    const colHeight = GRID_ROWS;
    const columns = Array.from({ length: GRID_COLS }, (_, col) =>
      Array.from({ length: colHeight }, (_, row) => ({ id: `c${col}r${row}`, letter: 'a' })),
    );
    const result = refillEmptySlots(createSeededRng('refill-full'), columns, 'test');
    expect(result).toBeNull();
  });
});

describe('buildLetterFreqMap', () => {
  it('counts letters correctly', () => {
    const columns = [
      [{ id: 'a', letter: 'a' }, { id: 'b', letter: 'a' }],
      [{ id: 'c', letter: 'b' }],
    ];
    const freq = buildLetterFreqMap(columns);
    expect(freq.get('a')).toBe(2);
    expect(freq.get('b')).toBe(1);
  });

  it('returns undefined for missing letters', () => {
    const freq = buildLetterFreqMap([]);
    expect(freq.get('z')).toBeUndefined();
  });
});

describe('pickTargetWord', () => {
  it('returns a word from the word pool that can be spelled', () => {
    const rng = createSeededRng('pick-test');
    const { columns, wordPool } = fillGrid(createSeededRng('pick-test-grid'));
    const word = pickTargetWord(rng, columns, wordPool);
    expect(word).not.toBeNull();

    if (word) {
      // Word should be in the pool
      expect(wordPool).toContain(word);
      
      // Word should be spellable from grid
      const freq = buildLetterFreqMap(columns);
      const needed = new Map<string, number>();
      for (const ch of word) needed.set(ch, (needed.get(ch) ?? 0) + 1);
      for (const [ch, count] of needed) {
        expect((freq.get(ch) ?? 0)).toBeGreaterThanOrEqual(count);
      }
    }
  });

  it('returns null for an empty grid', () => {
    const rng = createSeededRng('empty');
    const word = pickTargetWord(rng, [], []);
    expect(word).toBeNull();
  });

  it('is deterministic for the same rng state', () => {
    const { columns, wordPool } = fillGrid(createSeededRng('same-grid'));
    const a = pickTargetWord(createSeededRng('same-rng'), columns, wordPool);
    const b = pickTargetWord(createSeededRng('same-rng'), columns, wordPool);
    expect(a).toBe(b);
  });
  
  it('only returns words from the word pool', () => {
    const { columns, wordPool } = fillGrid(createSeededRng('pool-test'));
    const rng = createSeededRng('pick');
    
    for (let i = 0; i < 10; i++) {
      const word = pickTargetWord(rng, columns, wordPool);
      if (word) {
        expect(wordPool).toContain(word);
      }
    }
  });

  it('strongly favors shorter spellable words early in the match', () => {
    const columns = [[
      { id: 'a', letter: 'a' },
      { id: 'b', letter: 'b' },
      { id: 'c', letter: 'c' },
      { id: 'd', letter: 'd' },
      { id: 'e', letter: 'e' },
    ]];
    const wordPool = ['abc', 'abcd', 'abcde'];
    const counts = { abc: 0, abcd: 0, abcde: 0 };

    for (let i = 0; i < 500; i++) {
      const word = pickTargetWord(createSeededRng(`short-bias-${i}`), columns, wordPool, 0);
      if (word) counts[word as keyof typeof counts]++;
    }

    expect(counts.abc).toBeGreaterThan(counts.abcd);
    expect(counts.abcd).toBeGreaterThan(counts.abcde);
    expect(counts.abc).toBeGreaterThan(200);
  });

  it('evens out target length weights after the ramp', () => {
    expect(targetWordSelectionWeight(3, 0)).toBeGreaterThan(targetWordSelectionWeight(8, 0));
    expect(targetWordSelectionWeight(3, TARGET_WORD_LENGTH_RAMP)).toBe(
      targetWordSelectionWeight(8, TARGET_WORD_LENGTH_RAMP),
    );
  });
});

describe('calculateWordDuration', () => {
  function fullBoardColumns() {
    const letters = 'abcde'.repeat(Math.ceil((GRID_COLS * GRID_ROWS) / 5)).slice(0, GRID_COLS * GRID_ROWS);
    const columns = Array.from({ length: GRID_COLS }, () => [] as { id: string; letter: string }[]);
    letters.split('').forEach((letter, i) => {
      columns[i % GRID_COLS].push({ id: String(i), letter });
    });
    return columns;
  }

  it('gives ~12s on full board when letter scarcity is neutral', () => {
    const columns = fullBoardColumns();
    const word = 'abcde';
    const duration = calculateWordDuration(word, columns, SECONDS_PER_LETTER, 0, true, 3);
    const boardDensity = 1;
    const expected =
      word.length *
      SECONDS_PER_LETTER *
      (1.0 + 1.2 * boardDensity) *
      letterFrequencyMultiplier(calculateWordLetterScarcity(word, columns)) *
      1000;
    expect(duration).toBeCloseTo(expected, 0);
    expect(duration).toBeLessThan(12_000);
    expect(duration).toBeGreaterThan(10_000);
  });

  it('uses baseline density on an empty board with a min-duration floor', () => {
    const emptyColumns = Array.from({ length: GRID_COLS }, () => []);
    const word = 'abcde';
    const duration = calculateWordDuration(word, emptyColumns, SECONDS_PER_LETTER, 0, true, 3);
    const calculated =
      word.length *
      SECONDS_PER_LETTER *
      (1.0 + 1.2 * 0) *
      letterFrequencyMultiplier(calculateWordLetterScarcity(word, emptyColumns)) *
      1000;
    const minDuration = word.length * 0.8 * SECONDS_PER_LETTER * 1000;
    expect(duration).toBeCloseTo(Math.max(calculated, minDuration), 0);
  });

  it('adds time when word letters are scarce on the board', () => {
    const columns = [[
      { id: '1', letter: 'a' },
      { id: '2', letter: 'a' },
      { id: '3', letter: 'a' },
      { id: '4', letter: 'b' },
      { id: '5', letter: 'c' },
    ]];
    const scarce = calculateWordDuration('abc', columns, SECONDS_PER_LETTER, 0, true, 3);
    const abundant = calculateWordDuration('aaa', columns, SECONDS_PER_LETTER, 0, true, 3);
    expect(scarce).toBeGreaterThan(abundant);
  });

  it('never drops below 0.8× word length', () => {
    const cases = [
      { word: 'aaa', columns: [[{ id: '1', letter: 'a' }]] },
      { word: 'abcde', columns: fullBoardColumns() },
    ];
    for (const { word, columns } of cases) {
      const duration = calculateWordDuration(word, columns, SECONDS_PER_LETTER, 0, true, 3);
      const minDuration = word.length * 0.8 * SECONDS_PER_LETTER * 1000;
      expect(duration).toBeGreaterThanOrEqual(minDuration);
    }
  });

  it('adds extra time for pity after auto-skips', () => {
    const columns = fullBoardColumns();
    const base = calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, true, 3);
    const withPity = calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 2, true, 3);
    expect(withPity).toBeCloseTo(base * pityTimeMultiplier(2), 0);
    expect(withPity).toBeGreaterThan(base);
  });

  it('excludes pity from scoring baseline', () => {
    const columns = fullBoardColumns();
    const baseline = calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, false, 3);
    const withPityTimer = calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 3, true, 3);
    expect(baseline).toBe(calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, true, 3));
    expect(withPityTimer).toBeGreaterThan(baseline);
  });

  it('adds warm-up bonus for the first three words (timer only)', () => {
    const columns = fullBoardColumns();
    const base = calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, false, 0);
    expect(calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, true, 0)).toBe(base + WARMUP_BONUS_MS[0]);
    expect(calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, true, 1)).toBe(base + WARMUP_BONUS_MS[1]);
    expect(calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, true, 2)).toBe(base + WARMUP_BONUS_MS[2]);
    expect(calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, true, 3)).toBe(base);
    expect(calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, false, 0)).toBe(base);
  });

  it('applies solo difficulty time multiplier when pity is enabled', () => {
    const columns = fullBoardColumns();
    const base = calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, true, 3);
    expect(calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, true, 3, 2)).toBeCloseTo(base * 2, 0);
    expect(calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, true, 3, 4)).toBeCloseTo(base * 4, 0);
    expect(calculateWordDuration('abcde', columns, SECONDS_PER_LETTER, 0, false, 3, 4)).toBe(base);
  });
});

describe('2× mode streak', () => {
  it('compounds streak multipliers', () => {
    expect(doubleBonusStreakTimeMultiplier(0)).toBe(1);
    expect(doubleBonusStreakTimeMultiplier(1)).toBeCloseTo(0.9);
    expect(doubleBonusStreakTimeMultiplier(2)).toBeCloseTo(0.81);
    expect(doubleBonusStreakScoreMultiplier(2)).toBeCloseTo(1.21);
  });

  it('shortens timer compounding with 2× streak', () => {
    const { columns } = fillGrid(createSeededRng('streak-timer'));
    const player = {
      ...createInitialPlayerState(),
      columns,
      targetWord: 'abcde',
      doubleBonusActive: true,
      doubleBonusStreak: 2,
    };
    const base = getPlayerWordDuration(
      { ...player, doubleBonusStreak: 0 },
      'multiplayer',
    );
    const streaked = getPlayerWordDuration(player, 'multiplayer');
    expect(streaked).toBeCloseTo(base * 0.81, 0);
  });

  it('does not shorten timer without 2× active', () => {
    const { columns } = fillGrid(createSeededRng('streak-off'));
    const player = {
      ...createInitialPlayerState(),
      columns,
      targetWord: 'abcde',
      doubleBonusStreak: 3,
    };
    const normal = getPlayerWordDuration(player, 'multiplayer');
    const withoutStreak = getPlayerWordDuration(
      { ...player, doubleBonusStreak: 0 },
      'multiplayer',
    );
    expect(normal).toBe(withoutStreak);
  });

  it('returns 1× score without 2× active', () => {
    const player = {
      ...createInitialPlayerState(),
      doubleBonusStreak: 3,
    };
    expect(getMultiplayerScoreMultiplier(player)).toBe(1);
  });

  it('stacks 2× base multiplier on top of streak', () => {
    const player = {
      ...createInitialPlayerState(),
      doubleBonusStreak: 2,
      doubleBonusActive: true,
    };
    expect(getMultiplayerScoreMultiplier(player)).toBeCloseTo(1.21 * DOUBLE_BONUS_SCORE_MULTIPLIER);
  });

  it('formats active 2× multiplier labels to one decimal', () => {
    expect(formatDoubleBonusMultiplierLabel(0)).toBe('2.0×');
    expect(formatDoubleBonusMultiplierLabel(1)).toBe('2.2×');
    expect(formatDoubleBonusMultiplierLabel(2)).toBe('2.4×');
  });
});

describe('findHintCellId', () => {
  it('returns an unselected cell matching the next target letter', () => {
    const columns = [
      [{ id: 'a1', letter: 'b' }, { id: 'a2', letter: 'a' }],
      [{ id: 'b1', letter: 'l' }],
    ];
    const hintId = findHintCellId(columns, 'bal', []);
    expect(hintId).toBe('a1');
  });

  it('skips already selected cells', () => {
    const columns = [[{ id: 'a1', letter: 'b' }], [{ id: 'b1', letter: 'a' }]];
    const hintId = findHintCellId(columns, 'ba', ['a1']);
    expect(hintId).toBe('b1');
  });
});
