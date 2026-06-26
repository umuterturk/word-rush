import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction, GameState } from '../domain/types';
import { INITIAL_GAME_STATE } from '../domain/gameReducer';
import { updateGame } from '../domain/updateGame';
import type { SavedGameSession } from '../domain/savedGameSession';
import { shouldRestoreSavedSession } from './gameUrl';
import type { ClockPort, StoragePort } from '../ports';
import { AUTO_SKIP_ON_TIMEOUT } from '../domain/constants';
import { getPlayerWordDuration } from '../domain/gridUtils';

function frozenSoloLogicalTime(state: GameState): number | null {
  if (state.soloVictoryAt == null) return null;
  return Math.max(0, state.soloVictoryAt - state.matchStartedAt);
}

export interface GameSessionExtras {
  matchId?: string;
  inviteCode?: string;
  lastShuffleNonce?: number;
  prevPublishedScore?: number;
  sessionBadges?: SavedGameSession['sessionBadges'];
  lifetimeBadgeBefore?: SavedGameSession['lifetimeBadgeBefore'];
}

interface GameSessionOptions {
  getSessionExtras: () => GameSessionExtras;
  onRestored?: (session: SavedGameSession) => void;
}

interface GameSession {
  gameState: GameState;
  /** Milliseconds elapsed since match start (updated every animation frame). */
  logicalTime: number;
  /** Effective wall-clock time for gameplay timers (pauses while the game is paused). */
  gameClockNow: number;
  bestScore: number;
  hydrated: boolean;
  dispatchAction: (action: GameAction) => void;
  setGamePaused: (paused: boolean) => void;
  persistSession: (state: GameState) => void;
}

/**
 * Orchestrates the game loop, action queue, and best-score persistence.
 *
 * The hook owns:
 *   - The requestAnimationFrame loop
 *   - The pending-action queue (batched per frame for the reducer)
 *   - Loading/saving best score via StoragePort
 *   - Restoring an in-progress match after page reload
 *
 * It does NOT own rendering or input — those are React component concerns.
 *
 * Multiplayer note: to replay remote actions, simply push them into the action
 * queue via dispatchAction (after they arrive from MatchSyncPort).
 */
export function useGameSession(
  clock: ClockPort,
  storage: StoragePort,
  options: GameSessionOptions,
): GameSession {
  const { getSessionExtras, onRestored } = options;
  const onRestoredRef = useRef(onRestored);
  useEffect(() => {
    onRestoredRef.current = onRestored;
  }, [onRestored]);

  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [logicalTime, setLogicalTime] = useState(0);
  const [gameClockNow, setGameClockNow] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Refs let the rAF loop read/write current state without stale closures
  const stateRef = useRef<GameState>(INITIAL_GAME_STATE);
  const actionQueueRef = useRef<GameAction[]>([]);
  const pauseAccumMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);

  const getSessionExtrasRef = useRef(getSessionExtras);
  useEffect(() => {
    getSessionExtrasRef.current = getSessionExtras;
  }, [getSessionExtras]);

  const persistSession = useCallback(
    (state: GameState) => {
      if (state.matchStatus !== 'playing' && state.matchStatus !== 'ended') return;
      const extras = getSessionExtrasRef.current();
      void storage.saveGameSession({
        gameState: state,
        matchId: extras.matchId,
        inviteCode: extras.inviteCode,
        lastShuffleNonce: extras.lastShuffleNonce,
        prevPublishedScore: extras.prevPublishedScore,
        sessionBadges: extras.sessionBadges,
        lifetimeBadgeBefore: extras.lifetimeBadgeBefore,
      });
    },
    [storage],
  );

  // Restore an in-progress match saved before a refresh.
  useEffect(() => {
    let active = true;

    storage.loadGameSession().then(saved => {
      if (!active) return;

      if (saved?.gameState.matchStatus === 'ended') {
        stateRef.current = saved.gameState;
        setGameState(saved.gameState);
        onRestoredRef.current?.(saved);
      } else if (saved?.gameState.matchStatus === 'playing') {
        if (shouldRestoreSavedSession(saved)) {
          stateRef.current = saved.gameState;
          setGameState(saved.gameState);
          onRestoredRef.current?.(saved);
        } else {
          void storage.clearGameSession();
        }
      }

      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [storage]);

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

  useEffect(() => {
    if (gameState.matchStatus === 'playing') return;
    pauseAccumMsRef.current = 0;
    pauseStartedAtRef.current = null;
  }, [gameState.matchStatus]);

  // Persist or clear the active session as match status changes.
  useEffect(() => {
    if (!hydrated) return;

    if (gameState.matchStatus === 'idle') {
      void storage.clearGameSession();
      return;
    }

    persistSession(gameState);
  }, [gameState, hydrated, persistSession, storage]);

  // Flush the latest state when the page is hidden (refresh, tab switch, etc.).
  useEffect(() => {
    const onPageHide = () => {
      if (
        stateRef.current.matchStatus === 'playing'
        || stateRef.current.matchStatus === 'ended'
      ) {
        persistSession(stateRef.current);
      }
    };

    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [persistSession]);

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

  const getEffectiveNow = useCallback((now: number) => {
    let pausedMs = pauseAccumMsRef.current;
    if (pauseStartedAtRef.current !== null) {
      pausedMs += now - pauseStartedAtRef.current;
    }
    return now - pausedMs;
  }, []);

  const setGamePaused = useCallback(
    (paused: boolean) => {
      const now = clock.now();
      if (paused) {
        if (pauseStartedAtRef.current === null) {
          pauseStartedAtRef.current = now;
        }
        return;
      }
      if (pauseStartedAtRef.current !== null) {
        pauseAccumMsRef.current += now - pauseStartedAtRef.current;
        pauseStartedAtRef.current = null;
      }
    },
    [clock],
  );

  // Main animation loop
  useEffect(() => {
    let active = true;
    let frameHandle: number;

    const loop = () => {
      if (!active) return;

      const now = clock.now();
      const effectiveNow = getEffectiveNow(now);
      const pending = actionQueueRef.current.splice(0);
      const prev = stateRef.current;
      
      // Check if word timer has expired (before processing pending actions)
      if (
        prev.matchStatus === 'playing' &&
        !prev.soloVictoryPending &&
        AUTO_SKIP_ON_TIMEOUT &&
        prev.players['local']
      ) {
        const player = prev.players['local'];
        if (player.targetWord && player.wordStartedAt > 0) {
          const wordDuration = getPlayerWordDuration(
            player,
            prev.matchMode,
            'gameplay',
            { cols: prev.gridCols, rows: prev.gridRows },
          );
          const elapsed = Math.max(0, effectiveNow - player.wordStartedAt);
          if (elapsed >= wordDuration) {
            pending.push({ type: 'WORD_TIMEOUT', playerId: 'local', at: effectiveNow });
          }
        }
      }
      
      const next = updateGame(prev, effectiveNow, pending);

      if (next !== prev) {
        stateRef.current = next;
        setGameState(next);
      }

      setGameClockNow(effectiveNow);

      // Update logical time every frame so the arena animates smoothly
      const frozenSoloTime = frozenSoloLogicalTime(next);
      if (next.matchStatus === 'playing') {
        setLogicalTime(frozenSoloTime ?? effectiveNow - next.matchStartedAt);
      } else if (next.matchStatus === 'ended') {
        setLogicalTime(
          frozenSoloTime
            ?? (next.matchMode === 'solo' ? effectiveNow - next.matchStartedAt : next.matchDuration),
        );
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

  return {
    gameState,
    logicalTime,
    gameClockNow,
    bestScore,
    hydrated,
    dispatchAction,
    setGamePaused,
    persistSession,
  };
}
