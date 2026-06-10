import type { GameAction, GameState, PlayerState } from './types';
import { MAX_BUFFER_SIZE, MATCH_DURATION_MS, WORD_SCORE } from './constants';
import { createSeededRng } from './seededRng';
import { fillGrid, pickTargetWord } from './gridUtils';

export function createInitialPlayerState(): PlayerState {
  return {
    score: 0,
    columns: [],
    selectedIds: [],
    targetWord: '',
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
      const columns = fillGrid(rng);
      const targetWord = pickTargetWord(rng, columns) ?? '';
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
      const points = WORD_SCORE[targetWord.length] ?? 1;

      // Pick a new target word from the remaining letters
      // Use a deterministic seed derived from current score + word to stay reproducible
      const rng = createSeededRng(state.seed + '-' + (player.score + points));
      const nextWord = pickTargetWord(rng, newColumns);

      if (nextWord === null) {
        // No more words can be formed — end the match
        return {
          ...state,
          matchStatus: 'ended',
          players: {
            ...state.players,
            [action.playerId]: {
              ...player,
              score: player.score + points,
              columns: newColumns,
              selectedIds: [],
              targetWord: '',
            },
          },
        };
      }

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            score: player.score + points,
            columns: newColumns,
            selectedIds: [],
            targetWord: nextWord,
          },
        },
      };
    }

    default:
      return state;
  }
}
