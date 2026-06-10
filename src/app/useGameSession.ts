import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction, GameState } from '../domain/types';
import { INITIAL_GAME_STATE } from '../domain/gameReducer';
import { updateGame } from '../domain/updateGame';
import type { ClockPort, StoragePort } from '../ports';

interface GameSession {
  gameState: GameState;
  /** Milliseconds elapsed since match start (updated every animation frame). */
  logicalTime: number;
  bestScore: number;
  isPaused: boolean;
  dispatchAction: (action: GameAction) => void;
  togglePause: () => void;
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
  const [isPaused, setIsPaused] = useState(false);

  // Refs let the rAF loop read/write current state without stale closures
  const stateRef = useRef<GameState>(INITIAL_GAME_STATE);
  const actionQueueRef = useRef<GameAction[]>([]);
  const pausedRef = useRef(false);
  const pausedAccumulatedMsRef = useRef(0);
  const pauseStartedAtRef = useRef(0);

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

  // Clear pause state when a match is not actively playing
  useEffect(() => {
    if (gameState.matchStatus === 'playing') return;
    pausedRef.current = false;
    pausedAccumulatedMsRef.current = 0;
    setIsPaused(false);
  }, [gameState.matchStatus]);

  const getEffectiveNow = useCallback(() => {
    const now = clock.now();
    if (pausedRef.current) {
      return pauseStartedAtRef.current - pausedAccumulatedMsRef.current;
    }
    return now - pausedAccumulatedMsRef.current;
  }, [clock]);

  const togglePause = useCallback(() => {
    if (stateRef.current.matchStatus !== 'playing') return;
    if (pausedRef.current) {
      pausedAccumulatedMsRef.current += clock.now() - pauseStartedAtRef.current;
      pausedRef.current = false;
      setIsPaused(false);
    } else {
      pauseStartedAtRef.current = clock.now();
      pausedRef.current = true;
      setIsPaused(true);
    }
  }, [clock]);

  // Debug: Space toggles pause (dev builds only)
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.repeat) return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      togglePause();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePause]);

  // Main animation loop
  useEffect(() => {
    let active = true;
    let frameHandle: number;

    const loop = () => {
      if (!active) return;

      const now = getEffectiveNow();
      const pending = actionQueueRef.current.splice(0);
      const prev = stateRef.current;
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
  }, [clock, getEffectiveNow]);

  const dispatchAction = useCallback((action: GameAction) => {
    actionQueueRef.current.push(action);
  }, []);

  return { gameState, logicalTime, bestScore, isPaused, dispatchAction, togglePause };
}
