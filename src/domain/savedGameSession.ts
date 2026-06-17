import type { GameState, LandedCell, MatchMode, MatchStatus, PlayerState, SoloDifficulty } from './types';

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
  if (!state.players || typeof state.players !== 'object') return false;
  if (!isPlayerState(state.players.local)) return false;
  return true;
}

export function parseSavedGameSession(raw: unknown): SavedGameSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const session = raw as SavedGameSession;
  if (!isGameState(session.gameState)) return null;
  if (session.gameState.matchStatus !== 'playing') return null;
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
  return session;
}
