import { describe, it, expect } from 'vitest';
import { createSeededRng } from '../seededRng';
import { fillGrid, pickTargetWord, buildLetterFreqMap } from '../gridUtils';
import { GRID_COLS, GRID_ROWS, MAX_EMPTY_CELLS } from '../constants';

describe('fillGrid', () => {
  it('creates exactly GRID_COLS columns', () => {
    const rng = createSeededRng('test');
    const grid = fillGrid(rng);
    expect(grid).toHaveLength(GRID_COLS);
  });

  it('creates grid with strategic letter placement', () => {
    const rng = createSeededRng('strategic');
    const grid = fillGrid(rng);

    // Count total cells
    const totalCells = grid.reduce((sum, col) => sum + col.length, 0);
    const expectedMin = GRID_COLS * GRID_ROWS - MAX_EMPTY_CELLS;
    
    // Should fill most cells, leaving up to MAX_EMPTY_CELLS empty
    expect(totalCells).toBeGreaterThanOrEqual(expectedMin - 5);
    expect(totalCells).toBeLessThanOrEqual(GRID_COLS * GRID_ROWS);
  });

  it('generates valid cell IDs', () => {
    const rng = createSeededRng('ids');
    const grid = fillGrid(rng);

    for (let col = 0; col < grid.length; col++) {
      for (let row = 0; row < grid[col].length; row++) {
        const cell = grid[col][row];
        expect(cell.id).toMatch(/^c\d+r\d+$/);
      }
    }
  });

  it('all cell IDs are unique', () => {
    const rng = createSeededRng('unique');
    const grid = fillGrid(rng);
    const ids = grid.flat().map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all cells have lowercase Turkish letters', () => {
    const rng = createSeededRng('letters');
    const grid = fillGrid(rng);
    
    for (const col of grid) {
      for (const cell of col) {
        expect(cell.letter).toMatch(/^[a-zçğıöşü]$/);
        expect(Array.from(cell.letter)).toHaveLength(1);
      }
    }
  });

  it('is deterministic for same seed', () => {
    const grid1 = fillGrid(createSeededRng('same'));
    const grid2 = fillGrid(createSeededRng('same'));
    
    expect(grid1.flat().map(c => c.letter).join('')).toBe(
      grid2.flat().map(c => c.letter).join('')
    );
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
