import type { GameAction, GameState } from './types';
import { IS_DEV_GAMEPLAY } from './constants';
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
  if (state.matchStatus === 'idle' || state.matchStatus === 'ended') {
    return actions.reduce(gameReducer, state);
  }

  const logicalTime = wallClockTime - state.matchStartedAt;

  const soloTimedOut =
    state.matchMode === 'solo'
    && IS_DEV_GAMEPLAY
    && !state.soloVictoryPending
    && logicalTime >= state.matchDuration;
  if (logicalTime >= state.matchDuration && (state.matchMode !== 'solo' || soloTimedOut)) {
    return { ...state, matchStatus: 'ended' };
  }

  if (actions.length === 0) return state;
  return actions.reduce(gameReducer, state);
}
