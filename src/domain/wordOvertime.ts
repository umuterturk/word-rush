import type { GameState } from './types';
import { WORD_OVERTIME_PENALTY_TICK_MS } from './constants';
import { gameReducer } from './gameReducer';
import { getPlayerWordDuration } from './gridUtils';

/** Overtime ticks to charge (first tick applies as soon as the timer expires). */
export function wordOvertimeTicksElapsed(overtimeMs: number, tickMs = WORD_OVERTIME_PENALTY_TICK_MS): number {
  if (overtimeMs <= 0) return 0;
  return Math.ceil(overtimeMs / tickMs);
}

export function tickWordOvertime(state: GameState, wallClockTime: number): GameState {
  if (state.matchStatus !== 'playing' || state.soloVictoryPending) return state;

  const player = state.players['local'];
  if (!player?.targetWord || player.wordStartedAt <= 0) return state;

  const grid = { cols: state.gridCols, rows: state.gridRows };
  const wordDuration = getPlayerWordDuration(player, state.matchMode, 'gameplay', grid);
  const elapsed = Math.max(0, wallClockTime - player.wordStartedAt);
  const overtimeMs = elapsed - wordDuration;
  const overtimeTicks = wordOvertimeTicksElapsed(overtimeMs);
  const charged = player.overtimePenaltyTicks ?? 0;
  if (overtimeTicks <= charged) return state;

  return gameReducer(state, {
    type: 'WORD_OVERTIME',
    playerId: 'local',
    at: wallClockTime,
    overtimeTicks,
  });
}
