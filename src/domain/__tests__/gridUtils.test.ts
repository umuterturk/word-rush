import { describe, it, expect } from 'vitest';
import { createSeededRng } from '../seededRng';
import { fillGrid, pickTargetWord, buildLetterFreqMap } from '../gridUtils';
import { GRID_COLS, GRID_ROWS } from '../constants';

describe('fillGrid', () => {
  const rng = createSeededRng('test');
  const grid = fillGrid(rng);

  it('creates exactly GRID_COLS columns', () => {
    expect(grid).toHaveLength(GRID_COLS);
  });

  it('each column has exactly GRID_ROWS cells', () => {
    for (const col of grid) {
      expect(col).toHaveLength(GRID_ROWS);
    }
  });

  it('all cell IDs are unique', () => {
    const ids = grid.flat().map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all cells have a single-character letter', () => {
    for (const cell of grid.flat()) {
      expect(Array.from(cell.letter)).toHaveLength(1);
    }
  });

  it('uses positional IDs (c{col}r{row})', () => {
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        expect(grid[col][row].id).toBe(`c${col}r${row}`);
      }
    }
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

  it('returns 0 for missing letters', () => {
    const freq = buildLetterFreqMap([]);
    expect(freq.get('z')).toBeUndefined();
  });
});

describe('pickTargetWord', () => {
  it('returns a word that can be spelled from grid letters', () => {
    const rng = createSeededRng('pick-test');
    const grid = fillGrid(createSeededRng('pick-test-grid'));
    const word = pickTargetWord(rng, grid);
    expect(word).not.toBeNull();

    if (word) {
      const freq = buildLetterFreqMap(grid);
      const needed = new Map<string, number>();
      for (const ch of word) needed.set(ch, (needed.get(ch) ?? 0) + 1);
      for (const [ch, count] of needed) {
        expect((freq.get(ch) ?? 0)).toBeGreaterThanOrEqual(count);
      }
    }
  });

  it('returns null for an empty grid', () => {
    const rng = createSeededRng('empty');
    const word = pickTargetWord(rng, []);
    expect(word).toBeNull();
  });

  it('is deterministic for the same rng state', () => {
    const grid = fillGrid(createSeededRng('same-grid'));
    const a = pickTargetWord(createSeededRng('same-rng'), grid);
    const b = pickTargetWord(createSeededRng('same-rng'), grid);
    expect(a).toBe(b);
  });
});
