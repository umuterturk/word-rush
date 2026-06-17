import { describe, it, expect, beforeAll } from 'vitest';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { computeWordPoints } from '../gridUtils';
import type { GameState } from '../types';
import { GRID_COLS, GRID_ROWS, SOLO_REFILL_LIMIT } from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function startedState(
  seed = 'test',
  at = 1000,
  mode: 'solo' | 'multiplayer' = 'solo',
  difficulty: 'easy' | 'normal' | 'hard' = 'hard',
): GameState {
  return gameReducer(INITIAL_GAME_STATE, { type: 'START_MATCH', seed, at, mode, difficulty });
}

// ─── START_MATCH ──────────────────────────────────────────────────────────────

describe('START_MATCH', () => {
  let state: GameState;

  beforeAll(() => {
    state = startedState();
  });

  it('sets matchStatus to playing', () => {
    expect(state.matchStatus).toBe('playing');
  });

  it('fills the grid strategically with letters from words', () => {
    const player = state.players['local'];
    expect(player.columns).toHaveLength(GRID_COLS);
    
    // Should have most cells filled (allowing for MAX_EMPTY_CELLS empty)
    const totalCells = player.columns.reduce((sum, col) => sum + col.length, 0);
    expect(totalCells).toBe(GRID_COLS * GRID_ROWS);
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

  it('initializes solo refills and difficulty', () => {
    const easy = startedState('solo-init', 0, 'solo', 'easy');
    expect(easy.soloDifficulty).toBe('easy');
    expect(easy.players['local'].refillsRemaining).toBe(SOLO_REFILL_LIMIT);
  });

  it('does not set refills for multiplayer', () => {
    const mp = startedState('mp-init', 0, 'multiplayer');
    expect(mp.soloDifficulty).toBeUndefined();
    expect(mp.players['local'].refillsRemaining).toBe(0);
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

  it('ignores an already-selected cell', () => {
    const state = startedState();
    const firstLetter = Array.from(state.players['local'].targetWord)[0];
    const cellId = findCellForLetter(state, firstLetter)!;
    const selected = gameReducer(state, { type: 'SELECT_LETTER', playerId: 'local', letterId: cellId });
    const retapped = gameReducer(selected, { type: 'SELECT_LETTER', playerId: 'local', letterId: cellId });
    expect(retapped).toBe(selected);
    expect(retapped.players['local'].selectedIds).toContain(cellId);
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

  it('awards word points and clears cells on correct solo word', () => {
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

  it('injects a new word and keeps playing when the board is cleared in solo mode', () => {
    const state = stateWithOnlyTarget('bal');
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    expect(next.matchStatus).toBe('playing');
    const player = next.players['local'];
    const totalCells = player.columns.reduce((sum, col) => sum + col.length, 0);
    expect(totalCells).toBe(GRID_COLS * GRID_ROWS);
    expect(player.wordPool.length).toBeGreaterThan(0);
    expect(player.targetWord.length).toBeGreaterThan(0);
    expect(player.refillsRemaining).toBe(SOLO_REFILL_LIMIT - 1);
  });

  it('decrements refills on each correct solo word', () => {
    const state = stateWithManualTarget('bal');
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    expect(next.players['local'].refillsRemaining).toBe(SOLO_REFILL_LIMIT - 1);
  });

  it('keeps the same running score when the board is cleared in solo', () => {
    const state = {
      ...stateWithOnlyTarget('bal'),
      players: {
        local: {
          ...stateWithOnlyTarget('bal').players['local'],
          refillsRemaining: 0,
        },
      },
    };
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 30_000 });
    expect(next.matchStatus).toBe('ended');
    expect(next.players['local'].score).toBeGreaterThan(0);
  });

  it('ends solo when board is empty and refills are exhausted', () => {
    const state = {
      ...stateWithOnlyTarget('bal'),
      players: {
        local: {
          ...stateWithOnlyTarget('bal').players['local'],
          refillsRemaining: 0,
        },
      },
    };
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    expect(next.matchStatus).toBe('ended');
    expect(next.players['local'].columns.every(col => col.length === 0)).toBe(true);
    expect(next.players['local'].refillsRemaining).toBe(0);
  });

  it('does not refill solo when refills are exhausted', () => {
    const state = {
      ...stateWithManualTarget('bal'),
      players: {
        local: {
          ...stateWithManualTarget('bal').players['local'],
          refillsRemaining: 0,
        },
      },
    };
    const before = state.players['local'].columns.reduce((sum, col) => sum + col.length, 0);
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    const after = next.players['local'].columns.reduce((sum, col) => sum + col.length, 0);
    expect(after).toBe(before - 3);
    expect(next.players['local'].refillsRemaining).toBe(0);
  });

  it('keeps the board full after a correct word', () => {
    const state = stateWithManualTarget('bal');
    const before = state.players['local'].columns.reduce((sum, col) => sum + col.length, 0);
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    const after = next.players['local'].columns.reduce((sum, col) => sum + col.length, 0);
    expect(after).toBe(GRID_COLS * GRID_ROWS);
    expect(after).toBeGreaterThanOrEqual(before - 3);
  });

  it('keeps playing when the board is cleared in multiplayer mode', () => {
    const state = { ...stateWithOnlyTarget('bal'), matchMode: 'multiplayer' as const };
    const next = gameReducer(state, { type: 'SUBMIT_WORD', playerId: 'local', at: 2000 });
    expect(next.matchStatus).toBe('playing');
  });
});

describe('double bonus', () => {
  it('activates 2× and halves elapsed time on the current word', () => {
    const state = startedState('double', 1000, 'multiplayer');
    const player = state.players['local'];
    const at = 5000;
    const next = gameReducer(state, { type: 'ACTIVATE_DOUBLE', playerId: 'local', at });
    expect(next.players['local'].doubleBonusActive).toBe(true);
    expect(next.players['local'].doubleBonusUsed).toBe(false);
    expect(next.players['local'].wordStartedAt).toBe(at - (at - player.wordStartedAt) / 2);
  });

  it('ignores activation when already used', () => {
    const mp = startedState('double-used', 1000, 'multiplayer');
    const used = {
      ...mp,
      players: {
        local: { ...mp.players['local'], doubleBonusUsed: true },
      },
    };
    expect(gameReducer(used, { type: 'ACTIVATE_DOUBLE', playerId: 'local', at: 2000 })).toBe(used);
  });

  it('activates 2× in solo mode', () => {
    const solo = startedState('double-solo', 1000, 'solo');
    const next = gameReducer(solo, { type: 'ACTIVATE_DOUBLE', playerId: 'local', at: 2000 });
    expect(next.players['local'].doubleBonusActive).toBe(true);
  });

  it('doubles score on success and keeps 2× active', () => {
    const base = startedState('double-score', 1000, 'multiplayer');
    const manual = stateWithManualTargetFrom(base, 'balon');
    const submitted = manual.players['local'].wordStartedAt + 100;
    const withoutDouble = gameReducer(manual, { type: 'SUBMIT_WORD', playerId: 'local', at: submitted });
    const withDouble = {
      ...manual,
      players: {
        local: { ...manual.players['local'], doubleBonusActive: true },
      },
    };
    const withDoubleResult = gameReducer(withDouble, { type: 'SUBMIT_WORD', playerId: 'local', at: submitted });
    expect(withDoubleResult.players['local'].doubleBonusUsed).toBe(false);
    expect(withDoubleResult.players['local'].doubleBonusActive).toBe(true);
    expect(withDoubleResult.players['local'].score).toBeGreaterThan(withoutDouble.players['local'].score);
  });

  it('keeps 2× active across multiple successful words', () => {
    const base = startedState('double-streak', 1000, 'multiplayer');
    const activated = gameReducer(base, { type: 'ACTIVATE_DOUBLE', playerId: 'local', at: 2000 });
    const first = stateWithManualTargetFrom(activated, 'bal');
    const afterFirst = gameReducer(
      { ...first, players: { local: { ...first.players['local'], doubleBonusActive: true } } },
      { type: 'SUBMIT_WORD', playerId: 'local', at: 3000 },
    );
    expect(afterFirst.players['local'].doubleBonusActive).toBe(true);
    expect(afterFirst.players['local'].doubleBonusUsed).toBe(false);

    const second = stateWithManualTargetFrom(afterFirst, 'bal');
    const afterSecond = gameReducer(
      { ...second, players: { local: { ...second.players['local'], doubleBonusActive: true } } },
      { type: 'SUBMIT_WORD', playerId: 'local', at: 4000 },
    );
    expect(afterSecond.players['local'].doubleBonusActive).toBe(true);
    expect(afterSecond.players['local'].doubleBonusUsed).toBe(false);
  });

  it('disables 2× only after failing while active', () => {
    const base = startedState('double-fail', 1000, 'multiplayer');
    const activated = gameReducer(base, { type: 'ACTIVATE_DOUBLE', playerId: 'local', at: 2000 });
    const next = gameReducer(activated, { type: 'WORD_TIMEOUT', playerId: 'local', at: 9000 });
    expect(next.players['local'].doubleBonusUsed).toBe(true);
    expect(next.players['local'].doubleBonusActive).toBe(false);
  });

  it('does not disable 2× after skip when it was never activated', () => {
    const base = startedState('double-skip', 1000, 'multiplayer');
    const next = gameReducer(base, { type: 'SKIP_WORD', playerId: 'local', at: 5000 });
    expect(next.players['local'].doubleBonusUsed).toBe(false);
    expect(next.players['local'].doubleBonusActive).toBe(false);
  });

  it('leaves 2× available after finding a word without activating it', () => {
    const base = startedState('double-save', 1000, 'multiplayer');
    const manual = stateWithManualTargetFrom(base, 'bal');
    const next = gameReducer(manual, { type: 'SUBMIT_WORD', playerId: 'local', at: 3000 });
    expect(next.players['local'].doubleBonusUsed).toBe(false);
  });
});

describe('2× mode streak', () => {
  it('increments streak on success while 2× is active and resets on miss', () => {
    const base = startedState('streak', 1000, 'multiplayer');
    const withDouble = {
      ...stateWithManualTargetFrom(base, 'bal'),
      players: {
        local: { ...stateWithManualTargetFrom(base, 'bal').players['local'], doubleBonusActive: true },
      },
    };
    const afterFind = gameReducer(withDouble, { type: 'SUBMIT_WORD', playerId: 'local', at: 3000 });
    expect(afterFind.players['local'].doubleBonusStreak).toBe(1);

    const afterSkip = gameReducer(afterFind, { type: 'SKIP_WORD', playerId: 'local', at: 4000 });
    expect(afterSkip.players['local'].doubleBonusStreak).toBe(0);
  });

  it('does not increment streak without 2× active', () => {
    const base = startedState('streak-none', 1000, 'multiplayer');
    const manual = stateWithManualTargetFrom(base, 'bal');
    const afterFind = gameReducer(manual, { type: 'SUBMIT_WORD', playerId: 'local', at: 3000 });
    expect(afterFind.players['local'].doubleBonusStreak).toBe(0);
  });

  it('always awards whole-number points', () => {
    const base = startedState('round-score', 1000, 'multiplayer');
    const withDouble = {
      ...stateWithManualTargetFrom(base, 'bal'),
      players: {
        local: {
          ...stateWithManualTargetFrom(base, 'bal').players['local'],
          doubleBonusActive: true,
          doubleBonusStreak: 2,
        },
      },
    };
    const next = gameReducer(withDouble, { type: 'SUBMIT_WORD', playerId: 'local', at: 3000 });
    expect(Number.isInteger(next.players['local'].score)).toBe(true);
  });

  it('awards more solo timer score while 2× is active', () => {
    const base = startedState('solo-double', 1000, 'solo');
    const manual = stateWithManualTargetFrom(base, 'balon');
    const player = manual.players['local'];
    const submitted = player.wordStartedAt + 100;

    const withoutTimer = computeWordPoints({
      word: player.targetWord,
      columns: player.columns,
      submittedAt: submitted,
      wordStartedAt: player.wordStartedAt,
      matchMode: 'solo',
      player,
      soloDifficulty: 'hard',
    }).timerMultiplier;
    const withTimer = computeWordPoints({
      word: player.targetWord,
      columns: player.columns,
      submittedAt: submitted,
      wordStartedAt: player.wordStartedAt,
      matchMode: 'solo',
      player: { ...player, doubleBonusActive: true },
      soloDifficulty: 'hard',
    }).timerMultiplier;
    expect(withTimer).toBeGreaterThan(withoutTimer);
  });

  it('increments 2× streak on success while active and resets on miss', () => {
    const base = startedState('streak-score', 1000, 'multiplayer');
    const first = {
      ...stateWithManualTargetFrom(base, 'bal'),
      players: {
        local: { ...stateWithManualTargetFrom(base, 'bal').players['local'], doubleBonusActive: true },
      },
    };
    const afterFirst = gameReducer(first, { type: 'SUBMIT_WORD', playerId: 'local', at: 3000 });
    const second = stateWithManualTargetFrom(
      {
        ...afterFirst,
        players: {
          local: {
            ...afterFirst.players['local'],
            doubleBonusActive: true,
            wordStartedAt: 3000,
          },
        },
      },
      'bal',
    );
    const afterSecond = gameReducer(second, { type: 'SUBMIT_WORD', playerId: 'local', at: 5000 });
    expect(afterSecond.players['local'].doubleBonusStreak).toBe(2);
    expect(afterSecond.players['local'].score).toBeGreaterThan(afterFirst.players['local'].score);
  });

  it('tracks 2× streak in solo when active', () => {
    const base = startedState('solo-streak', 1000, 'solo');
    const manual = {
      ...stateWithManualTargetFrom(base, 'bal'),
      players: {
        local: {
          ...stateWithManualTargetFrom(base, 'bal').players['local'],
          doubleBonusActive: true,
        },
      },
    };
    const afterFind = gameReducer(manual, { type: 'SUBMIT_WORD', playerId: 'local', at: 3000 });
    expect(afterFind.players['local'].doubleBonusStreak).toBe(1);
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
        usedWords: [word],
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
