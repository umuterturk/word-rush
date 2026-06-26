import { describe, expect, it } from 'vitest';
import { updateGame } from '../updateGame';
import { INITIAL_GAME_STATE } from '../gameReducer';
import { IS_DEV_GAMEPLAY } from '../constants';

describe('updateGame solo dev timeout', () => {
  it('does not end solo during victory celebration in dev gameplay', () => {
    if (!IS_DEV_GAMEPLAY) return;

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

  it('ends solo on dev timer when not in victory celebration', () => {
    if (!IS_DEV_GAMEPLAY) return;

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
    expect(next.matchStatus).toBe('ended');
  });
});
