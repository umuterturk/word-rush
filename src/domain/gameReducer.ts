import type { GameAction, GameState, PlayerState, LandedCell } from './types';
import { MAX_BUFFER_SIZE, MATCH_DURATION_MS, SKIP_PENALTY, SOLO_REFILL_LIMIT, getMatchGridDimensions, type GridDimensions } from './constants';
import { createSeededRng } from './seededRng';
import { fillGrid, pickTargetWord, isBoardEmpty, getCellById, isCorrectNextLetter, refillEmptySlots, computeWordPoints, getPlayerWordDuration, updateSoloAdaptiveMultiplier } from './gridUtils';

export function createInitialPlayerState(): PlayerState {
  return {
    score: 0,
    columns: [],
    selectedIds: [],
    targetWord: '',
    wordsCompleted: 0,
    doubleBonusStreak: 0,
    wordPool: [],
    usedWords: [],
    wordStartedAt: 0,
    shuffleUsed: false,
    doubleBonusActive: false,
    doubleBonusUsed: false,
    pityTimeouts: 0,
    refillsRemaining: 0,
    soloAdaptiveMultiplier: 1,
  };
}

export const INITIAL_GAME_STATE: GameState = {
  matchStatus: 'idle',
  matchMode: 'solo',
  language: 'tr',
  matchStartedAt: 0,
  matchDuration: MATCH_DURATION_MS,
  seed: '',
  gridCols: 0,
  gridRows: 0,
  players: {},
};

function matchGrid(state: GameState): GridDimensions {
  return { cols: state.gridCols, rows: state.gridRows };
}

/**
 * Pure reducer: (state, action) => state.
 * No side effects, no imports from React/DOM/timers.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_MATCH': {
      const rng = createSeededRng(action.seed);
      const language = action.language ?? 'tr';
      const isSolo = action.mode === 'solo';
      const difficulty = isSolo ? (action.difficulty ?? 'normal') : undefined;
      const grid = getMatchGridDimensions(action.mode, difficulty);
      const { columns, wordPool } = fillGrid(rng, language, grid);
      const targetWord = pickTargetWord(rng, columns, wordPool) ?? '';
      return {
        matchStatus: 'playing',
        matchMode: action.mode,
        language,
        matchStartedAt: action.at,
        matchDuration: MATCH_DURATION_MS,
        seed: action.seed,
        soloDifficulty: difficulty,
        gridCols: grid.cols,
        gridRows: grid.rows,
        players: {
          local: {
            score: 0,
            columns,
            selectedIds: [],
            targetWord,
            wordsCompleted: 0,
            doubleBonusStreak: 0,
            wordPool,
            usedWords: [...wordPool],
            wordStartedAt: action.at,
            shuffleUsed: false,
            doubleBonusActive: false,
            doubleBonusUsed: false,
            pityTimeouts: 0,
            refillsRemaining: isSolo ? SOLO_REFILL_LIMIT : 0,
            soloAdaptiveMultiplier: 1,
          },
        },
      };
    }

    case 'END_MATCH': {
      if (state.matchStatus !== 'playing') return state;
      return { ...state, matchStatus: 'ended', soloVictoryPending: undefined };
    }

    case 'RESET': {
      return INITIAL_GAME_STATE;
    }

    case 'TRIGGER_SOLO_VICTORY': {
      if (state.matchMode !== 'solo' || state.matchStatus !== 'playing') return state;
      const player = state.players[action.playerId];
      if (!player) return state;
      return {
        ...state,
        soloVictoryPending: true,
        soloVictoryAt: action.at,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            columns: player.columns.map(() => []),
            selectedIds: [],
            targetWord: '',
            wordPool: [],
          },
        },
      };
    }

    case 'SELECT_LETTER': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const { letterId } = action;
      const { selectedIds, columns } = player;

      // Verify the cell exists in the grid
      const exists = columns.some(col => col.some(c => c.id === letterId));
      if (!exists) return state;

      if (selectedIds.includes(letterId)) return state;

      if (selectedIds.length >= MAX_BUFFER_SIZE) return state;
      const letter = getCellById(columns, letterId)?.letter;
      if (!letter || !isCorrectNextLetter(player.targetWord, selectedIds.length, letter)) {
        return state;
      }
      const newSelectedIds = [...selectedIds, letterId];

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
      const isSolo = state.matchMode === 'solo';
      const newWordsCompleted = player.wordsCompleted + 1;
      const newDoubleBonusStreak = player.doubleBonusActive ? player.doubleBonusStreak + 1 : player.doubleBonusStreak;
      const grid = matchGrid(state);
      const gameplayAllowedMs = getPlayerWordDuration(
        player,
        state.matchMode,
        'gameplay',
        grid,
      );
      const elapsedMs = Math.max(0, action.at - player.wordStartedAt);
      const newAdaptiveMultiplier = isSolo
        ? updateSoloAdaptiveMultiplier(
            player.soloAdaptiveMultiplier ?? 1,
            elapsedMs,
            gameplayAllowedMs,
            'success',
          )
        : (player.soloAdaptiveMultiplier ?? 1);
      const points = computeWordPoints({
        word: targetWord,
        columns,
        submittedAt: action.at,
        wordStartedAt: player.wordStartedAt,
        matchMode: state.matchMode,
        player,
        soloDifficulty: state.soloDifficulty,
        grid: matchGrid(state),
      }).total;

      // Remove the completed word from the pool
      let finalColumns = newColumns;
      let finalWordPool = player.wordPool.filter(w => w !== targetWord);
      let finalUsedWords = player.usedWords;
      let refillsRemaining = player.refillsRemaining;
      const usedWordSet = new Set(finalUsedWords);

      // Solo: refill only while refills remain
      if (state.matchMode === 'solo' && refillsRemaining > 0) {
        const refillRng = createSeededRng(state.seed + '-refill-' + newWordsCompleted);
        const refill = refillEmptySlots(
          refillRng,
          finalColumns,
          `inj${newWordsCompleted}`,
          state.language ?? 'tr',
          usedWordSet,
          grid,
        );
        if (refill) {
          finalColumns = refill.columns;
          finalWordPool = [...finalWordPool, ...refill.words];
          finalUsedWords = [...finalUsedWords, ...refill.words];
          refillsRemaining -= 1;
        }
      } else if (state.matchMode === 'multiplayer') {
        const refillRng = createSeededRng(state.seed + '-refill-' + newWordsCompleted);
        const refill = refillEmptySlots(
          refillRng,
          finalColumns,
          `inj${newWordsCompleted}`,
          state.language ?? 'tr',
          usedWordSet,
          grid,
        );
        if (refill) {
          finalColumns = refill.columns;
          finalWordPool = [...finalWordPool, ...refill.words];
          finalUsedWords = [...finalUsedWords, ...refill.words];
        }
      }

      // Pick a new target word from the remaining letters and word pool
      // Use a deterministic seed derived from current score + word to stay reproducible
      const rng = createSeededRng(state.seed + '-' + newWordsCompleted);
      const nextWord = pickTargetWord(rng, finalColumns, finalWordPool);

      const boardCleared = isBoardEmpty(finalColumns);
      const soloComplete = isSolo && boardCleared && refillsRemaining === 0;
      const newScore = player.score + points;

      return {
        ...state,
        soloVictoryPending: soloComplete ? true : state.soloVictoryPending,
        soloVictoryAt: soloComplete ? action.at : state.soloVictoryAt,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            score: newScore,
            columns: finalColumns,
            selectedIds: [],
            targetWord: nextWord ?? '',
            wordsCompleted: newWordsCompleted,
            doubleBonusStreak: newDoubleBonusStreak,
            wordPool: finalWordPool,
            usedWords: finalUsedWords,
            wordStartedAt: action.at,
            pityTimeouts: Math.max(0, player.pityTimeouts - 1),
            refillsRemaining,
            soloAdaptiveMultiplier: newAdaptiveMultiplier,
          },
        },
      };
    }

    case 'SKIP_WORD': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const newScore = player.score - SKIP_PENALTY;
      const newWordsCompleted = player.wordsCompleted + 1;
      const isSolo = state.matchMode === 'solo';
      const grid = matchGrid(state);
      const gameplayAllowedMs = getPlayerWordDuration(
        player,
        state.matchMode,
        'gameplay',
        grid,
      );
      const elapsedMs = Math.max(0, action.at - player.wordStartedAt);
      const newAdaptiveMultiplier = isSolo
        ? updateSoloAdaptiveMultiplier(
            player.soloAdaptiveMultiplier ?? 1,
            elapsedMs,
            gameplayAllowedMs,
            'skip',
          )
        : (player.soloAdaptiveMultiplier ?? 1);

      const rng = createSeededRng(state.seed + '-skip-' + newWordsCompleted);
      const nextWord = pickTargetWord(rng, player.columns, player.wordPool);

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
            doubleBonusStreak: player.doubleBonusActive ? 0 : player.doubleBonusStreak,
            wordStartedAt: action.at,
            pityTimeouts: player.pityTimeouts,
            doubleBonusActive: false,
            doubleBonusUsed: player.doubleBonusActive || player.doubleBonusUsed,
            soloAdaptiveMultiplier: newAdaptiveMultiplier,
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
      const isSolo = state.matchMode === 'solo';
      const grid = matchGrid(state);
      const gameplayAllowedMs = getPlayerWordDuration(
        player,
        state.matchMode,
        'gameplay',
        grid,
      );
      const elapsedMs = Math.max(0, action.at - player.wordStartedAt);
      const newAdaptiveMultiplier = isSolo
        ? updateSoloAdaptiveMultiplier(
            player.soloAdaptiveMultiplier ?? 1,
            elapsedMs,
            gameplayAllowedMs,
            'timeout',
          )
        : (player.soloAdaptiveMultiplier ?? 1);

      const rng = createSeededRng(state.seed + '-skip-' + newWordsCompleted);
      const nextWord = pickTargetWord(rng, player.columns, player.wordPool);

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
            doubleBonusStreak: player.doubleBonusActive ? 0 : player.doubleBonusStreak,
            wordStartedAt: action.at,
            pityTimeouts: newPityTimeouts,
            doubleBonusActive: false,
            doubleBonusUsed: player.doubleBonusActive || player.doubleBonusUsed,
            soloAdaptiveMultiplier: newAdaptiveMultiplier,
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

    case 'ACTIVATE_DOUBLE': {
      const player = state.players[action.playerId];
      if (!player || player.doubleBonusUsed || player.doubleBonusActive || !player.targetWord) return state;

      const elapsed = Math.max(0, action.at - player.wordStartedAt);
      const newStartedAt = action.at - elapsed / 2;

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            doubleBonusActive: true,
            doubleBonusStreak: 0,
            wordStartedAt: newStartedAt,
          },
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
