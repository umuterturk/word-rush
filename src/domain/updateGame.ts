import type { GameAction, GameState } from './types';
import { gameReducer } from './gameReducer';

/**
 * Advances game state to the given wall-clock time and folds any pending
 * actions through the reducer.
 *
 * @param state         Current game state
 * @param wallClockTime Current wall-clock milliseconds (e.g. from ClockPort.now())
 * @param actions       Actions queued since the last update call
 */
export function updateGame(
  state: GameState,
  wallClockTime: number,
  actions: GameAction[],
): GameState {
  if (state.matchStatus === 'idle') {
    return actions.reduce(gameReducer, state);
  }

  if (state.matchStatus === 'ended') {
    return state;
  }

  const logicalTime = wallClockTime - state.matchStartedAt;

  if (logicalTime >= state.matchDuration) {
    return { ...state, matchStatus: 'ended' };
  }

  if (actions.length === 0) return state;
  return actions.reduce(gameReducer, state);
}
