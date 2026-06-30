import type { BadgeCounts } from './badges';
import { BADGE_IDS } from './badges';
import type { GameState, LandedCell, MatchMode, MatchStatus, PlayerState, SoloDifficulty } from './types';
import { getMatchGridDimensions } from './constants';
import { getPlayerWordDuration } from './gridUtils';

export interface SavedGameSession {
  gameState: GameState;
  /** Multiplayer only: Firebase match document id for reconnection. */
  matchId?: string;
  /** Multiplayer private rooms: invite code used in ?join= for refresh restore. */
  inviteCode?: string;
  /** Last processed incoming shuffle nonce (multiplayer). */
  lastShuffleNonce?: number;
  /** Score at last publish (multiplayer). */
  prevPublishedScore?: number;
  /** Badges earned during this match (for end-screen restore after refresh). */
  sessionBadges?: BadgeCounts;
  /** Lifetime badge totals before this match's badges were merged in. */
  lifetimeBadgeBefore?: BadgeCounts;
}

function isBadgeCounts(value: unknown): value is BadgeCounts {
  if (!value || typeof value !== 'object') return false;
  const counts = value as Record<string, unknown>;
  return BADGE_IDS.every(id => {
    const n = counts[id];
    return n === undefined || (typeof n === 'number' && Number.isFinite(n) && n >= 0);
  });
}

function isMatchStatus(value: unknown): value is MatchStatus {
  return value === 'idle' || value === 'playing' || value === 'ended';
}

function isMatchMode(value: unknown): value is MatchMode {
  return value === 'solo' || value === 'multiplayer';
}

function isSoloDifficulty(value: unknown): value is SoloDifficulty {
  return value === 'easy' || value === 'normal' || value === 'hard';
}

function isLandedCell(value: unknown): value is LandedCell {
  if (!value || typeof value !== 'object') return false;
  const cell = value as LandedCell;
  return typeof cell.id === 'string' && typeof cell.letter === 'string';
}

function isPlayerState(value: unknown): value is PlayerState {
  if (!value || typeof value !== 'object') return false;
  const player = value as PlayerState;
  if (typeof player.score !== 'number') return false;
  if (!Array.isArray(player.columns)) return false;
  if (!player.columns.every(col => Array.isArray(col) && col.every(cell => cell == null || isLandedCell(cell)))) {
    return false;
  }
  if (!Array.isArray(player.selectedIds) || !player.selectedIds.every(id => typeof id === 'string')) {
    return false;
  }
  if (typeof player.targetWord !== 'string') return false;
  if (typeof player.wordsCompleted !== 'number') return false;
  if (player.wordStreak !== undefined && typeof player.wordStreak !== 'number') return false;
  if (typeof player.doubleBonusStreak !== 'number') return false;
  if (!Array.isArray(player.wordPool) || !player.wordPool.every(word => typeof word === 'string')) {
    return false;
  }
  if (
    player.usedWords !== undefined
    && (!Array.isArray(player.usedWords) || !player.usedWords.every(word => typeof word === 'string'))
  ) {
    return false;
  }
  if (typeof player.wordStartedAt !== 'number') return false;
  if (typeof player.shuffleUsed !== 'boolean') return false;
  if (typeof player.doubleBonusActive !== 'boolean') return false;
  if (typeof player.doubleBonusUsed !== 'boolean') return false;
  if (typeof player.pityTimeouts !== 'number') return false;
  if (typeof player.refillsRemaining !== 'number') return false;
  if (
    player.soloAdaptiveMultiplier !== undefined
    && typeof player.soloAdaptiveMultiplier !== 'number'
  ) {
    return false;
  }
  if (
    player.wordGameplayDurationMs !== undefined
    && typeof player.wordGameplayDurationMs !== 'number'
  ) {
    return false;
  }
  if (
    player.overtimePenaltyTicks !== undefined
    && typeof player.overtimePenaltyTicks !== 'number'
  ) {
    return false;
  }
  return true;
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const state = value as GameState;
  if (!isMatchStatus(state.matchStatus)) return false;
  if (!isMatchMode(state.matchMode)) return false;
  if (typeof state.matchStartedAt !== 'number') return false;
  if (typeof state.matchDuration !== 'number') return false;
  if (typeof state.seed !== 'string') return false;
  if (state.soloDifficulty !== undefined && !isSoloDifficulty(state.soloDifficulty)) return false;
  if (state.gridCols !== undefined && typeof state.gridCols !== 'number') return false;
  if (state.gridRows !== undefined && typeof state.gridRows !== 'number') return false;
  if (!state.players || typeof state.players !== 'object') return false;
  if (!isPlayerState(state.players.local)) return false;
  return true;
}

export function parseSavedGameSession(raw: unknown): SavedGameSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const session = raw as SavedGameSession;
  if (!isGameState(session.gameState)) return null;
  const status = session.gameState.matchStatus;
  if (status !== 'playing' && status !== 'ended') return null;
  if (session.sessionBadges !== undefined && !isBadgeCounts(session.sessionBadges)) return null;
  if (session.lifetimeBadgeBefore !== undefined && !isBadgeCounts(session.lifetimeBadgeBefore)) {
    return null;
  }
  if (session.matchId !== undefined && typeof session.matchId !== 'string') return null;
  if (session.inviteCode !== undefined && typeof session.inviteCode !== 'string') return null;
  if (session.lastShuffleNonce !== undefined && typeof session.lastShuffleNonce !== 'number') {
    return null;
  }
  if (session.prevPublishedScore !== undefined && typeof session.prevPublishedScore !== 'number') {
    return null;
  }
  if (session.gameState.matchMode === 'multiplayer' && !session.matchId) return null;
  if (!session.gameState.players.local.usedWords) {
    session.gameState.players.local.usedWords = [...session.gameState.players.local.wordPool];
  }
  if (session.gameState.players.local.soloAdaptiveMultiplier === undefined) {
    session.gameState.players.local.soloAdaptiveMultiplier = 1;
  }
  if (session.gameState.players.local.wordStreak === undefined) {
    session.gameState.players.local.wordStreak = 0;
  }
  if (!session.gameState.gridCols || !session.gameState.gridRows) {
    const grid = getMatchGridDimensions(
      session.gameState.matchMode,
      session.gameState.soloDifficulty,
    );
    session.gameState.gridCols = grid.cols;
    session.gameState.gridRows = grid.rows;
  }
  const local = session.gameState.players.local;
  if (local.wordGameplayDurationMs === undefined) {
    const grid = {
      cols: session.gameState.gridCols,
      rows: session.gameState.gridRows,
    };
    local.wordGameplayDurationMs =
      local.targetWord && local.wordStartedAt > 0
        ? getPlayerWordDuration(local, session.gameState.matchMode, 'gameplay', grid)
        : 0;
  }
  return session;
}
