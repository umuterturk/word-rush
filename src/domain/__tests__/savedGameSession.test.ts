import { describe, expect, it } from 'vitest';
import { INITIAL_GAME_STATE } from '../gameReducer';
import { parseSavedGameSession, type SavedGameSession } from '../savedGameSession';
import type { GameState } from '../types';
import {
  getJoinCodeFromUrl,
  hasJoinGameParam,
  hasSoloGameParam,
  shouldRestoreSavedSession,
} from '../../app/gameUrl';

function playingState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...INITIAL_GAME_STATE,
    matchStatus: 'playing',
    matchMode: 'solo',
    matchStartedAt: 1_000,
    seed: 'test-seed',
    soloDifficulty: 'normal',
    gridCols: 7,
    gridRows: 9,
    players: {
      local: {
        score: 12,
        columns: [[{ id: 'a1', letter: 'A' }]],
        selectedIds: [],
        targetWord: 'AT',
        wordsCompleted: 1,
        wordStreak: 1,
        doubleBonusStreak: 0,
        wordPool: ['AT'],
        usedWords: ['AT'],
        wordStartedAt: 1_000,
        shuffleUsed: false,
        doubleBonusActive: false,
        doubleBonusUsed: false,
        pityTimeouts: 0,
        refillsRemaining: 3,
        soloAdaptiveMultiplier: 1,
      },
    },
    ...overrides,
  };
}

function soloSession(): SavedGameSession | null {
  return parseSavedGameSession({ gameState: playingState() });
}

describe('parseSavedGameSession', () => {
  it('backfills usedWords from wordPool for older saves', () => {
    const legacyState = {
      gameState: {
        ...playingState(),
        players: {
          local: {
            ...playingState().players.local,
            usedWords: undefined,
          },
        },
      },
    };
    const parsed = parseSavedGameSession(legacyState);
    expect(parsed?.gameState.players.local.usedWords).toEqual(['AT']);
  });

  it('accepts a valid solo session', () => {
    const parsed = parseSavedGameSession({ gameState: playingState() });
    expect(parsed?.gameState.players.local.score).toBe(12);
  });

  it('requires matchId for multiplayer sessions', () => {
    expect(
      parseSavedGameSession({
        gameState: playingState({ matchMode: 'multiplayer', soloDifficulty: undefined }),
      }),
    ).toBeNull();
  });

  it('accepts a valid multiplayer session', () => {
    const parsed = parseSavedGameSession({
      gameState: playingState({ matchMode: 'multiplayer', soloDifficulty: undefined }),
      matchId: 'match-123',
      inviteCode: 'ABCD12',
      lastShuffleNonce: 2,
      prevPublishedScore: 8,
    });
    expect(parsed?.matchId).toBe('match-123');
    expect(parsed?.inviteCode).toBe('ABCD12');
  });

  it('rejects idle matches', () => {
    expect(parseSavedGameSession({ gameState: INITIAL_GAME_STATE })).toBeNull();
  });

  it('accepts ended matches for end-screen restore', () => {
    const parsed = parseSavedGameSession({
      gameState: playingState({ matchStatus: 'ended' }),
      sessionBadges: { fast_1: 2, fast_2: 0, rare_1: 1, rare_2: 0, double: 0 },
      lifetimeBadgeBefore: { fast_1: 5, fast_2: 0, rare_1: 0, rare_2: 0, double: 0 },
    });
    expect(parsed?.gameState.matchStatus).toBe('ended');
    expect(parsed?.sessionBadges?.fast_1).toBe(2);
  });
});

describe('gameUrl restore gating', () => {
  it('detects solo and join params', () => {
    expect(hasSoloGameParam('?solo')).toBe(true);
    expect(hasSoloGameParam('?solo=')).toBe(true);
    expect(hasJoinGameParam('?join=abcd12')).toBe(true);
    expect(getJoinCodeFromUrl('?join=abcd12')).toBe('ABCD12');
  });

  it('restores solo only with ?solo in the url', () => {
    const session = soloSession();
    expect(session).not.toBeNull();
    expect(shouldRestoreSavedSession(session!, '?solo')).toBe(true);
    expect(shouldRestoreSavedSession(session!, '')).toBe(false);
  });

  it('restores multiplayer only with matching ?join in the url', () => {
    const session = parseSavedGameSession({
      gameState: playingState({ matchMode: 'multiplayer', soloDifficulty: undefined }),
      matchId: 'match-123',
      inviteCode: 'ABCD12',
    });
    expect(session).not.toBeNull();
    expect(shouldRestoreSavedSession(session!, '?join=ABCD12')).toBe(true);
    expect(shouldRestoreSavedSession(session!, '?join=WRONG1')).toBe(false);
    expect(shouldRestoreSavedSession(session!, '')).toBe(false);
  });
});
