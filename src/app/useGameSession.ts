import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction, GameState } from '../domain/types';
import { INITIAL_GAME_STATE } from '../domain/gameReducer';
import { updateGame } from '../domain/updateGame';
import type { ClockPort, StoragePort } from '../ports';
import { SECONDS_PER_LETTER, AUTO_SKIP_ON_TIMEOUT } from '../domain/constants';
import { calculateWordDuration } from '../domain/gridUtils';

interface GameSession {
  gameState: GameState;
  /** Milliseconds elapsed since match start (updated every animation frame). */
  logicalTime: number;
  bestScore: number;
  dispatchAction: (action: GameAction) => void;
}

/**
 * Orchestrates the game loop, action queue, and best-score persistence.
 *
 * The hook owns:
 *   - The requestAnimationFrame loop
 *   - The pending-action queue (batched per frame for the reducer)
 *   - Loading/saving best score via StoragePort
 *
 * It does NOT own rendering or input — those are React component concerns.
 *
 * Multiplayer note: to replay remote actions, simply push them into the action
 * queue via dispatchAction (after they arrive from MatchSyncPort).
 */
export function useGameSession(clock: ClockPort, storage: StoragePort): GameSession {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [logicalTime, setLogicalTime] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  // Refs let the rAF loop read/write current state without stale closures
  const stateRef = useRef<GameState>(INITIAL_GAME_STATE);
  const actionQueueRef = useRef<GameAction[]>([]);

  // Load best score on mount
  useEffect(() => {
    storage.loadBestScore().then(setBestScore);
  }, [storage]);

  // Save best score whenever a match ends
  useEffect(() => {
    if (gameState.matchStatus !== 'ended') return;
    const localScore = gameState.players['local']?.score ?? 0;
    setBestScore(prev => {
      if (localScore > prev) {
        storage.saveBestScore(localScore);
        return localScore;
      }
      return prev;
    });
  }, [gameState.matchStatus, storage]); // intentional: fires once per status change

  // Debug: Space adds 10 seconds (dev builds only)
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.repeat) return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      
      // Add 10 seconds to the match duration
      if (stateRef.current.matchStatus === 'playing') {
        const newDuration = stateRef.current.matchDuration + 10_000;
        stateRef.current = { ...stateRef.current, matchDuration: newDuration };
        setGameState(prev => ({ ...prev, matchDuration: newDuration }));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Main animation loop
  useEffect(() => {
    let active = true;
    let frameHandle: number;

    const loop = () => {
      if (!active) return;

      const now = clock.now();
      const pending = actionQueueRef.current.splice(0);
      const prev = stateRef.current;
      
      // Check if word timer has expired (before processing pending actions)
      if (
        prev.matchStatus === 'playing' &&
        AUTO_SKIP_ON_TIMEOUT &&
        prev.players['local']
      ) {
        const player = prev.players['local'];
        if (player.targetWord && player.wordStartedAt > 0) {
          const wordDuration = calculateWordDuration(
            player.targetWord,
            player.columns,
            SECONDS_PER_LETTER,
            player.pityTimeouts,
            true,
            player.wordsCompleted,
          );
          const elapsed = now - player.wordStartedAt;
          if (elapsed >= wordDuration) {
            pending.push({ type: 'WORD_TIMEOUT', playerId: 'local', at: now });
          }
        }
      }
      
      const next = updateGame(prev, now, pending);

      if (next !== prev) {
        stateRef.current = next;
        setGameState(next);
      }

      // Update logical time every frame so the arena animates smoothly
      if (next.matchStatus === 'playing') {
        setLogicalTime(now - next.matchStartedAt);
      } else if (next.matchStatus === 'ended') {
        setLogicalTime(next.matchDuration);
      } else {
        setLogicalTime(0);
      }

      frameHandle = clock.requestFrame(loop);
    };

    frameHandle = clock.requestFrame(loop);

    return () => {
      active = false;
      clock.cancelFrame(frameHandle);
    };
  }, [clock]);

  const dispatchAction = useCallback((action: GameAction) => {
    actionQueueRef.current.push(action);
  }, []);

  return { gameState, logicalTime, bestScore, dispatchAction };
}
