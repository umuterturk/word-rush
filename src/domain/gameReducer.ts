import type { GameAction, GameState, PlayerState, StackItem } from './types';
import {
  TARGET_SUM,
  MAX_STACK_SIZE,
  REMOVE_COOLDOWN_MS,
  MATCH_DURATION_MS,
} from './constants';
import { generateNumberStream } from './numberStream';

export function createInitialPlayerState(): PlayerState {
  return {
    score: 0,
    stack: [],
    removeCooldownUntil: 0,
    collectedIds: new Set(),
  };
}

export const INITIAL_GAME_STATE: GameState = {
  matchStatus: 'idle',
  matchStartedAt: 0,
  matchDuration: MATCH_DURATION_MS,
  seed: '',
  stream: [],
  players: {},
};

/**
 * Pure reducer: (state, action) => state.
 *
 * No side effects, no imports from React/DOM/timers.
 * Remote actions from future multiplayer adapters can be replayed
 * through this same function to reproduce any past state exactly.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_MATCH': {
      return {
        matchStatus: 'playing',
        matchStartedAt: action.at,
        matchDuration: MATCH_DURATION_MS,
        seed: action.seed,
        stream: generateNumberStream(action.seed),
        players: {
          local: createInitialPlayerState(),
        },
      };
    }

    case 'END_MATCH': {
      if (state.matchStatus !== 'playing') return state;
      return { ...state, matchStatus: 'ended' };
    }

    case 'COLLECT_NUMBER': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const entry = state.stream.find(e => e.id === action.numberId);
      if (!entry) return state;

      // Validate the tile is active at the moment the action was created
      const logicalTime = action.at - state.matchStartedAt;
      const fallDuration = 1 / entry.fallSpeed;
      const isActive =
        entry.spawnTime <= logicalTime &&
        logicalTime < entry.spawnTime + fallDuration &&
        !player.collectedIds.has(action.numberId);

      if (!isActive) return state;

      // Sliding window: when the stack is full, evict the oldest item first
      const baseStack =
        player.stack.length >= MAX_STACK_SIZE
          ? player.stack.slice(1)
          : player.stack;

      const newStack: StackItem[] = [
        ...baseStack,
        { numberId: action.numberId, value: entry.value },
      ];
      const newCollectedIds = new Set(player.collectedIds);
      newCollectedIds.add(action.numberId);
      const newSum = newStack.reduce((s, item) => s + item.value, 0);

      if (newSum === TARGET_SUM) {
        // Exact 21 → score and clear stack immediately
        return {
          ...state,
          players: {
            ...state.players,
            [action.playerId]: {
              ...player,
              score: player.score + 1,
              stack: [],
              collectedIds: newCollectedIds,
            },
          },
        };
      }

      // Overshoot (> 21) or under — player must manage their stack
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            stack: newStack,
            collectedIds: newCollectedIds,
          },
        },
      };
    }

    case 'REMOVE_STACK_ITEM': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const logicalTime = action.at - state.matchStartedAt;
      if (logicalTime < player.removeCooldownUntil) return state;

      if (action.stackIndex < 0 || action.stackIndex >= player.stack.length) return state;

      const newStack = player.stack.filter((_, i) => i !== action.stackIndex);
      const newSum = newStack.reduce((s, item) => s + item.value, 0);

      if (newSum === TARGET_SUM) {
        // Removing led to exactly 21 → score and clear
        return {
          ...state,
          players: {
            ...state.players,
            [action.playerId]: {
              ...player,
              score: player.score + 1,
              stack: [],
              removeCooldownUntil: logicalTime + REMOVE_COOLDOWN_MS,
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
            stack: newStack,
            removeCooldownUntil: logicalTime + REMOVE_COOLDOWN_MS,
          },
        },
      };
    }

    default:
      return state;
  }
}
