import { describe, it, expect } from 'vitest';
import { createSeededRng } from '../seededRng';
import { fillGrid, pickTargetWord, buildLetterFreqMap } from '../gridUtils';
import { GRID_COLS } from '../constants';

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

  it('generates grid with strategic letter placement from word pool', () => {
    const rng = createSeededRng('strategic');
    const { columns, wordPool } = fillGrid(rng);

    // Count total cells
    const totalCells = columns.reduce((sum, col) => sum + col.length, 0);
    
    // Should fill all cells when MAX_EMPTY_CELLS = 0
    expect(totalCells).toBeGreaterThan(55);
    
    // Word pool should not be empty
    expect(wordPool.length).toBeGreaterThan(0);
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
});
