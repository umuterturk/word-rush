import { describe, it, expect } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import type { GameState } from '../types';
import { GRID_COLS } from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function startedState(seed = 'test', at = 1000, mode: 'solo' | 'multiplayer' = 'solo'): GameState {
  return gameReducer(INITIAL_GAME_STATE, { type: 'START_MATCH', seed, at, mode });
}

// ─── START_MATCH ──────────────────────────────────────────────────────────────

describe('START_MATCH', () => {
  const state = startedState();

  it('sets matchStatus to playing', () => {
    expect(state.matchStatus).toBe('playing');
  });

  it('fills the grid strategically with letters from words', () => {
    const player = state.players['local'];
    expect(player.columns).toHaveLength(GRID_COLS);
    
    // Should have most cells filled (allowing for MAX_EMPTY_CELLS empty)
    const totalCells = player.columns.reduce((sum, col) => sum + col.length, 0);
    expect(totalCells).toBeGreaterThan(50); // At least 50 cells filled
  });

  it('picks a non-empty target word', () => {
    expect(state.players['local'].targetWord.length).toBeGreaterThan(0);
  });

  it('starts with score 0 and empty selection', () => {
    const player = state.players['local'];
    expect(player.score).toBe(0);
    expect(player.selectedIds).toEqual([]);
  });

  it('is deterministic for the same seed', () => {
    const a = startedState('same', 0);
    const b = startedState('same', 0);
    expect(a.players['local'].targetWord).toBe(b.players['local'].targetWord);
    expect(a.players['local'].columns).toEqual(b.players['local'].columns);
  });
});

// ─── RESET ────────────────────────────────────────────────────────────────────

describe('RESET', () => {
  it('returns INITIAL_GAME_STATE', () => {
    const next = gameReducer(startedState(), { type: 'RESET' });
    expect(next).toEqual(INITIAL_GAME_STATE);
  });
});

// ─── SELECT_LETTER ────────────────────────────────────────────────────────────

function findCellForLetter(state: GameState, letter: string): string | null {
  const player = state.players['local'];
  for (const col of player.columns) {
    for (const cell of col) {
      if (cell.letter === letter) return cell.id;
    }
  }
  return null;
}

describe('SELECT_LETTER', () => {
  it('ignores unknown cell IDs', () => {
    const state = startedState();
    const next = gameReducer(state, { type: 'SELECT_LETTER', playerId: 'local', letterId: 'nonexistent' });
    expect(next).toBe(state);
  });

  it('selects a cell when it matches the next target letter', () => {
    const state = startedState();
    const firstLetter = Array.from(state.players['local'].targetWord)[0];
    const cellId = findCellForLetter(state, firstLetter);
    expect(cellId).toBeTruthy();
    const next = gameReducer(state, { type: 'SELECT_LETTER', playerId: 'local', letterId: cellId! });
    expect(next.players['local'].selectedIds).toContain(cellId);
  });

  it('rejects a cell when it does not match the next target letter', () => {
    const state = startedState();
    const targetWord = state.players['local'].targetWord;
    const firstLetter = Array.from(targetWord)[0];
    const wrongCell = state.players['local'].columns
      .flat()
      .find(cell => cell.letter !== firstLetter);
    expect(wrongCell).toBeTruthy();
    const next = gameReducer(state, {
      type: 'SELECT_LETTER',
      playerId: 'local',
      letterId: wrongCell!.id,
    });
    expect(next).toBe(state);
    expect(next.players['local'].selectedIds).toEqual([]);
  });

  it('deselects an already-selected cell (toggle)', () => {
    const state = startedState();
    const firstLetter = Array.from(state.players['local'].targetWord)[0];
    const cellId = findCellForLetter(state, firstLetter)!;
    const selected = gameReducer(state, { type: 'SELECT_LETTER', playerId: 'local', letterId: cellId });
    const deselected = gameReducer(selected, { type: 'SELECT_LETTER', playerId: 'local', letterId: cellId });
    expect(deselected.players['local'].selectedIds).not.toContain(cellId);
  });
});

// ─── CLEAR_SELECTION ──────────────────────────────────────────────────────────

describe('CLEAR_SELECTION', () => {
  it('empties selectedIds', () => {
    const state = startedState();
    const firstLetter = Array.from(state.players['local'].targetWord)[0];
    const cellId = findCellForLetter(state, firstLetter)!;
    const withSelection = gameReducer(state, { type: 'SELECT_LETTER', playerId: 'local', letterId: cellId });
    const cleared = gameReducer(withSelection, { type: 'CLEAR_SELECTION', playerId: 'local' });
    expect(cleared.players['local'].selectedIds).toEqual([]);
  });
});

// ─── SUBMIT_WORD ──────────────────────────────────────────────────────────────

describe('SUBMIT_WORD', () => {
  /**
   * Build a state where we know the target word and can select exactly the
   * right cells to form it.
   */
  function stateWithManualTarget(word: string): GameState {
    const base = startedState('manual-' + word);
    const player = base.players['local'];

    // Override the grid so every cell in column 0 spells out the word
    const wordCells = Array.from(word).map((letter, i) => ({ id: `w${i}`, letter }));
    const newColumns = player.columns.map((col, colIdx) =>
      colIdx === 0
        ? wordCells
        : col,
    );

    return {
      ...base,
      players: {
        local: {
          ...player,
          columns: newColumns,
          targetWord: word,
          selectedIds: wordCells.map(c => c.id),
        },
      },
    };
  }

  it('awards points and clears cells on correct word', () => {
    const state = stateWithManualTarget('bal');
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    const player = next.players['local'];
    expect(player.score).toBeGreaterThan(0);
    expect(player.selectedIds).toEqual([]);
    // The word cells should be removed from columns
    const allIds = player.columns.flat().map(c => c.id);
    expect(allIds).not.toContain('w0');
    expect(allIds).not.toContain('w1');
    expect(allIds).not.toContain('w2');
  });

  it('clears selection only on wrong word', () => {
    const state = startedState();
    const player = state.players['local'];
    // Select 3 cells regardless of what word they form
    const ids = [
      player.columns[0][0].id,
      player.columns[1][0].id,
      player.columns[2][0].id,
    ];
    const withSel = {
      ...state,
      players: {
        local: {
          ...player,
          selectedIds: ids,
          // Ensure target word doesn't match these 3 cells
          targetWord: 'zzz',
        },
      },
    };
    const next = gameReducer(withSel, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    expect(next.players['local'].score).toBe(0);
    expect(next.players['local'].selectedIds).toEqual([]);
    // Cells should still be in the grid
    expect(next.players['local'].columns.flat().some(c => c.id === ids[0])).toBe(true);
  });

  it('does nothing if fewer than 3 letters selected', () => {
    const state = startedState();
    const player = state.players['local'];
    const withSel = {
      ...state,
      players: {
        local: { ...player, selectedIds: [player.columns[0][0].id] },
      },
    };
    const next = gameReducer(withSel, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    // should clear selection (wrong word path since 1 char != targetWord)
    expect(next.players['local'].score).toBe(0);
  });

  it('gradually reduces pity after a correct word', () => {
    const withPity = {
      ...stateWithManualTarget('bal'),
      players: {
        local: {
          ...stateWithManualTarget('bal').players['local'],
          pityTimeouts: 3,
        },
      },
    };
    const next = gameReducer(withPity, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    expect(next.players['local'].pityTimeouts).toBe(2);
  });

  it('ends the match when the board is cleared in solo mode', () => {
    const state = stateWithOnlyTarget('bal');
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    expect(next.matchStatus).toBe('ended');
    expect(next.players['local'].columns.every(col => col.length === 0)).toBe(true);
  });

  it('keeps playing when the board is cleared in multiplayer mode', () => {
    const state = { ...stateWithOnlyTarget('bal'), matchMode: 'multiplayer' as const };
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    expect(next.matchStatus).toBe('playing');
  });
});

describe('pity timer', () => {
  it('resets wordStartedAt on manual skip', () => {
    const state = startedState();
    const skipped = gameReducer(state, {
      type: 'SKIP_WORD',
      playerId: 'local',
      at: 9000,
    });
    expect(skipped.players['local'].wordStartedAt).toBe(9000);
  });

  it('increments pity on auto-skip and keeps it on manual skip', () => {
    const state = startedState();
    const afterTimeout = gameReducer(state, {
      type: 'WORD_TIMEOUT',
      playerId: 'local',
      at: 5000,
    });
    expect(afterTimeout.players['local'].pityTimeouts).toBe(1);

    const afterManualSkip = gameReducer(afterTimeout, {
      type: 'SKIP_WORD',
      playerId: 'local',
      at: 6000,
    });
    expect(afterManualSkip.players['local'].pityTimeouts).toBe(1);
  });

  it('decays pity on success and re-grows on auto-skip', () => {
    let state = startedState();
    for (let i = 0; i < 3; i++) {
      state = gameReducer(state, { type: 'WORD_TIMEOUT', playerId: 'local', at: 1000 + i });
    }
    expect(state.players['local'].pityTimeouts).toBe(3);

    const manual = stateWithManualTargetFrom(state, 'bal');
    state = gameReducer(manual, { type: 'SUBMIT_WORD', playerId: 'local', at: 7000 });
    expect(state.players['local'].pityTimeouts).toBe(2);

    const manual2 = stateWithManualTargetFrom(state, 'bal');
    state = gameReducer(manual2, { type: 'SUBMIT_WORD', playerId: 'local', at: 8000 });
    expect(state.players['local'].pityTimeouts).toBe(1);

    state = gameReducer(state, { type: 'WORD_TIMEOUT', playerId: 'local', at: 9000 });
    expect(state.players['local'].pityTimeouts).toBe(2);
  });
});

function stateWithOnlyTarget(word: string): GameState {
  const base = startedState('only-' + word);
  const player = base.players['local'];
  const wordCells = Array.from(word).map((letter, i) => ({ id: `w${i}`, letter }));
  const emptyColumns = player.columns.map(() => [] as typeof player.columns[number]);
  emptyColumns[0] = wordCells;

  return {
    ...base,
    players: {
      local: {
        ...player,
        columns: emptyColumns,
        targetWord: word,
        selectedIds: wordCells.map(c => c.id),
        wordPool: [word],
      },
    },
  };
}

function stateWithManualTargetFrom(base: GameState, word: string): GameState {
  const player = base.players['local'];
  const wordCells = Array.from(word).map((letter, i) => ({ id: `w${i}`, letter }));
  const newColumns = player.columns.map((col, colIdx) =>
    colIdx === 0 ? wordCells : col,
  );
  return {
    ...base,
    players: {
      local: {
        ...player,
        columns: newColumns,
        targetWord: word,
        selectedIds: wordCells.map(c => c.id),
      },
    },
  };
}
