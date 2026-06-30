import { describe, expect, it } from 'vitest';
import { updateGame } from '../updateGame';
import { gameReducer, INITIAL_GAME_STATE } from '../gameReducer';
import { WORD_OVERTIME_PENALTY_TICK_MS } from '../constants';
import { wordOvertimeTicksElapsed } from '../wordOvertime';
import { getPlayerWordDuration } from '../gridUtils';

describe('wordOvertimeTicksElapsed', () => {
  it('charges the first overtime tick as soon as the timer expires', () => {
    expect(wordOvertimeTicksElapsed(1, WORD_OVERTIME_PENALTY_TICK_MS)).toBe(1);
    expect(wordOvertimeTicksElapsed(WORD_OVERTIME_PENALTY_TICK_MS, WORD_OVERTIME_PENALTY_TICK_MS)).toBe(1);
  });

  it('charges another tick every second', () => {
    expect(wordOvertimeTicksElapsed(WORD_OVERTIME_PENALTY_TICK_MS + 1, WORD_OVERTIME_PENALTY_TICK_MS)).toBe(2);
    expect(wordOvertimeTicksElapsed(WORD_OVERTIME_PENALTY_TICK_MS * 3, WORD_OVERTIME_PENALTY_TICK_MS)).toBe(3);
  });
});

describe('updateGame word overtime', () => {
  it('applies overtime penalties even when no other actions are queued', () => {
    const started = gameReducer(INITIAL_GAME_STATE, {
      type: 'START_MATCH',
      seed: 'overtime-tick',
      at: 1_000,
      mode: 'solo',
      difficulty: 'hard',
    });
    const player = started.players['local'];
    const wordDuration = getPlayerWordDuration(
      player,
      started.matchMode,
      'gameplay',
      { cols: started.gridCols, rows: started.gridRows },
    );
    const state = {
      ...started,
      players: {
        local: {
          ...player,
          score: 30,
          wordStartedAt: 5_000,
        },
      },
    };

    const next = updateGame(state, 5_000 + wordDuration + 50, []);
    expect(next.players['local'].score).toBe(25);
    expect(next.players['local'].overtimePenaltyTicks).toBe(1);
    expect(next.players['local'].targetWord).toBe(player.targetWord);
  });
});

describe('updateGame solo match timer', () => {
  it('does not end solo when match duration elapses', () => {
    const state = {
      ...INITIAL_GAME_STATE,
      matchStatus: 'playing' as const,
      matchMode: 'solo' as const,
      matchStartedAt: 0,
      matchDuration: 30_000,
      gridCols: 5,
      gridRows: 5,
      players: INITIAL_GAME_STATE.players,
    };

    const next = updateGame(state, 35_000, []);
    expect(next.matchStatus).toBe('playing');
  });

  it('does not end solo during victory celebration when duration elapses', () => {
    const state = {
      ...INITIAL_GAME_STATE,
      matchStatus: 'playing' as const,
      matchMode: 'solo' as const,
      matchStartedAt: 0,
      matchDuration: 30_000,
      soloVictoryPending: true,
      gridCols: 5,
      gridRows: 5,
      players: INITIAL_GAME_STATE.players,
    };

    const next = updateGame(state, 35_000, []);
    expect(next.matchStatus).toBe('playing');
  });

  it('ends multiplayer when match duration elapses', () => {
    const state = {
      ...INITIAL_GAME_STATE,
      matchStatus: 'playing' as const,
      matchMode: 'multiplayer' as const,
      matchStartedAt: 0,
      matchDuration: 30_000,
      gridCols: 5,
      gridRows: 5,
      players: INITIAL_GAME_STATE.players,
    };

    const next = updateGame(state, 35_000, []);
    expect(next.matchStatus).toBe('ended');
  });
});
