import type { GameAction, GameState, PlayerState, LandedCell } from './types';
import { MAX_BUFFER_SIZE, MATCH_DURATION_MS, WORD_SCORE, SKIP_PENALTY, SECONDS_PER_LETTER } from './constants';
import { createSeededRng } from './seededRng';
import { fillGrid, pickTargetWord, calculateWordDuration, isBoardEmpty, getCellById, isCorrectNextLetter } from './gridUtils';

export function createInitialPlayerState(): PlayerState {
  return {
    score: 0,
    columns: [],
    selectedIds: [],
    targetWord: '',
    wordsCompleted: 0,
    wordPool: [],
    wordStartedAt: 0,
    shuffleUsed: false,
    pityTimeouts: 0,
  };
}

export const INITIAL_GAME_STATE: GameState = {
  matchStatus: 'idle',
  matchMode: 'solo',
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
        matchMode: action.mode,
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
            shuffleUsed: false,
            pityTimeouts: 0,
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
        const letter = getCellById(columns, letterId)?.letter;
        if (!letter || !isCorrectNextLetter(player.targetWord, selectedIds.length, letter)) {
          return state;
        }
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
      
      // Speed bonus uses fair baseline (no pity) so extra time doesn't inflate score
      const scoreDuration = calculateWordDuration(
        targetWord,
        columns,
        SECONDS_PER_LETTER,
        0,
        false,
      );
      const elapsed = action.at - player.wordStartedAt;
      const remaining = Math.max(0, scoreDuration - elapsed);
      const speedBonus = Math.floor(remaining / 1000); // Bonus = remaining seconds
      
      const points = basePoints + speedBonus;
      const newWordsCompleted = player.wordsCompleted + 1;

      // Remove the completed word from the pool
      const newWordPool = player.wordPool.filter(w => w !== targetWord);

      // Pick a new target word from the remaining letters and word pool
      // Use a deterministic seed derived from current score + word to stay reproducible
      const rng = createSeededRng(state.seed + '-' + (player.score + points));
      const nextWord = pickTargetWord(rng, newColumns, newWordPool, newWordsCompleted);

      const boardCleared = isBoardEmpty(newColumns);

      return {
        ...state,
        matchStatus:
          boardCleared && state.matchMode === 'solo' ? 'ended' : state.matchStatus,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            score: player.score + points,
            columns: newColumns,
            selectedIds: [],
            targetWord: nextWord ?? '',
            wordsCompleted: newWordsCompleted,
            wordPool: newWordPool,
            wordStartedAt: action.at,
            pityTimeouts: Math.max(0, player.pityTimeouts - 1),
          },
        },
      };
    }

    case 'SKIP_WORD': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const newScore = player.score - SKIP_PENALTY;
      const newWordsCompleted = player.wordsCompleted + 1;

      const rng = createSeededRng(state.seed + '-skip-' + newWordsCompleted);
      const nextWord = pickTargetWord(rng, player.columns, player.wordPool, newWordsCompleted);

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            score: newScore,
            selectedIds: [],
            targetWord: nextWord ?? '',
            wordsCompleted: newWordsCompleted,
            wordStartedAt: action.at,
            pityTimeouts: player.pityTimeouts,
          },
        },
      };
    }

    case 'WORD_TIMEOUT': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const newScore = player.score - SKIP_PENALTY;
      const newWordsCompleted = player.wordsCompleted + 1;
      const newPityTimeouts = player.pityTimeouts + 1;

      const rng = createSeededRng(state.seed + '-skip-' + newWordsCompleted);
      const nextWord = pickTargetWord(rng, player.columns, player.wordPool, newWordsCompleted);

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            score: newScore,
            selectedIds: [],
            targetWord: nextWord ?? '',
            wordsCompleted: newWordsCompleted,
            wordStartedAt: action.at,
            pityTimeouts: newPityTimeouts,
          },
        },
      };
    }

    case 'MARK_SHUFFLE_USED': {
      // Sender side: record that this player has spent their one-time shuffle.
      const player = state.players[action.playerId];
      if (!player || player.shuffleUsed) return state;
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: { ...player, shuffleUsed: true },
        },
      };
    }

    case 'SHUFFLE_BOARD': {
      // Receiver side: the opponent attacked us — scramble our own board.
      const player = state.players[action.playerId];
      if (!player) return state;

      // Collect all cells currently on the board
      const allCells: LandedCell[] = [];
      for (const col of player.columns) {
        allCells.push(...col);
      }
      if (allCells.length === 0) return state;

      // Shuffle (Fisher–Yates). Non-deterministic is fine: this only mutates the
      // receiver's local board, which is never compared against the opponent's.
      const rng = createSeededRng(state.seed + '-shuffle-' + Date.now() + '-' + allCells.length);
      for (let i = allCells.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
      }

      // Redistribute evenly across the same number of columns
      const colCount = player.columns.length || allCells.length;
      const newColumns: LandedCell[][] = Array.from({ length: colCount }, () => []);
      allCells.forEach((cell, idx) => {
        newColumns[idx % colCount].push(cell);
      });

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            columns: newColumns,
            selectedIds: [], // letters moved — drop any in-progress selection
          },
        },
      };
    }

    default:
      return state;
  }
}
