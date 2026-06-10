import type { GameAction, GameState, PlayerState } from './types';
import { MAX_BUFFER_SIZE, MATCH_DURATION_MS, WORD_SCORE, SKIP_PENALTY, SECONDS_PER_LETTER } from './constants';
import { createSeededRng } from './seededRng';
import { fillGrid, pickTargetWord, calculateWordDuration } from './gridUtils';

export function createInitialPlayerState(): PlayerState {
  return {
    score: 0,
    columns: [],
    selectedIds: [],
    targetWord: '',
    wordsCompleted: 0,
    wordPool: [],
    wordStartedAt: 0,
  };
}

export const INITIAL_GAME_STATE: GameState = {
  matchStatus: 'idle',
  matchStartedAt: 0,
  matchDuration: MATCH_DURATION_MS,
  seed: '',
  players: {},
};

/**
 * Pure reducer: (state, action) => state.
 * No side effects, no imports from React/DOM/timers.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_MATCH': {
      const rng = createSeededRng(action.seed);
      const { columns, wordPool } = fillGrid(rng);
      const targetWord = pickTargetWord(rng, columns, wordPool, 0) ?? '';
      return {
        matchStatus: 'playing',
        matchStartedAt: action.at,
        matchDuration: MATCH_DURATION_MS,
        seed: action.seed,
        players: {
          local: {
            score: 0,
            columns,
            selectedIds: [],
            targetWord,
            wordsCompleted: 0,
            wordPool,
            wordStartedAt: action.at,
          },
        },
      };
    }

    case 'END_MATCH': {
      if (state.matchStatus !== 'playing') return state;
      return { ...state, matchStatus: 'ended' };
    }

    case 'RESET': {
      return INITIAL_GAME_STATE;
    }

    case 'SELECT_LETTER': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const { letterId } = action;
      const { selectedIds, columns } = player;

      // Verify the cell exists in the grid
      const exists = columns.some(col => col.some(c => c.id === letterId));
      if (!exists) return state;

      let newSelectedIds: string[];
      if (selectedIds.includes(letterId)) {
        // Truncate: keep only letters before the tapped one
        newSelectedIds = selectedIds.slice(0, selectedIds.indexOf(letterId));
      } else {
        if (selectedIds.length >= MAX_BUFFER_SIZE) return state;
        newSelectedIds = [...selectedIds, letterId];
      }

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: { ...player, selectedIds: newSelectedIds },
        },
      };
    }

    case 'CLEAR_SELECTION': {
      const player = state.players[action.playerId];
      if (!player) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: { ...player, selectedIds: [] },
        },
      };
    }

    case 'SUBMIT_WORD': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const { selectedIds, columns, targetWord } = player;

      // Build letter map from current grid
      const letterMap = new Map<string, string>();
      for (const col of columns) {
        for (const cell of col) letterMap.set(cell.id, cell.letter);
      }

      const formed = selectedIds.map(id => letterMap.get(id) ?? '').join('');

      if (formed !== targetWord) {
        // Wrong word — clear selection only
        return {
          ...state,
          players: {
            ...state.players,
            [action.playerId]: { ...player, selectedIds: [] },
          },
        };
      }

      // Correct! Clear selected cells and compute new score
      const clearSet = new Set(selectedIds);
      const newColumns = columns.map(col => col.filter(cell => !clearSet.has(cell.id)));
      const basePoints = WORD_SCORE[targetWord.length] ?? 1;
      
      // Calculate speed bonus based on remaining time
      const wordDuration = calculateWordDuration(targetWord.length, columns, SECONDS_PER_LETTER);
      const elapsed = Date.now() - player.wordStartedAt;
      const remaining = Math.max(0, wordDuration - elapsed);
      const speedBonus = Math.floor(remaining / 1000); // Bonus = remaining seconds
      
      const points = basePoints + speedBonus;
      const newWordsCompleted = player.wordsCompleted + 1;

      // Remove the completed word from the pool
      const newWordPool = player.wordPool.filter(w => w !== targetWord);

      // Pick a new target word from the remaining letters and word pool
      // Use a deterministic seed derived from current score + word to stay reproducible
      const rng = createSeededRng(state.seed + '-' + (player.score + points));
      const nextWord = pickTargetWord(rng, newColumns, newWordPool, newWordsCompleted);

      // Continue game even if no more words available (let timer run out naturally)
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            score: player.score + points,
            columns: newColumns,
            selectedIds: [],
            targetWord: nextWord ?? '', // Empty if no more words
            wordsCompleted: newWordsCompleted,
            wordPool: newWordPool,
            wordStartedAt: state.matchStartedAt + (Date.now() - state.matchStartedAt), // Current time
          },
        },
      };
    }

    case 'SKIP_WORD':
    case 'WORD_TIMEOUT': {
      const player = state.players[action.playerId];
      if (!player) return state;

      // Apply penalty (can go negative)
      const newScore = player.score - SKIP_PENALTY;
      const newWordsCompleted = player.wordsCompleted + 1;

      // Pick a new target word (same grid, just different word from pool)
      const rng = createSeededRng(state.seed + '-skip-' + newWordsCompleted);
      const nextWord = pickTargetWord(rng, player.columns, player.wordPool, newWordsCompleted);

      // Continue game even if no more words available (let timer run out naturally)
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            score: newScore,
            selectedIds: [],
            targetWord: nextWord ?? '', // Empty if no more words
            wordsCompleted: newWordsCompleted,
            wordStartedAt: action.type === 'WORD_TIMEOUT' ? action.at : state.matchStartedAt + (Date.now() - state.matchStartedAt),
          },
        },
      };
    }

    default:
      return state;
  }
}
