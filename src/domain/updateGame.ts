import type { GameAction, GameState } from './types';
import { gameReducer } from './gameReducer';
import { tickWordOvertime } from './wordOvertime';

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

  let next = actions.length > 0 ? actions.reduce(gameReducer, state) : state;

  if (next.matchStatus === 'playing' && !next.soloVictoryPending) {
    next = tickWordOvertime(next, wallClockTime);
  }

  const logicalTime = wallClockTime - next.matchStartedAt;

  if (next.matchStatus === 'playing' && logicalTime >= next.matchDuration && next.matchMode !== 'solo') {
    return { ...next, matchStatus: 'ended' };
  }

  return next;
}
