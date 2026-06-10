import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserClockAdapter } from './adapters/BrowserClockAdapter';
import { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
import { FirebaseMultiplayerAdapter } from './adapters/FirebaseMultiplayerAdapter';
import { NoopMultiplayerAdapter } from './adapters/NoopMultiplayerAdapter';
import { FirebaseAnalyticsAdapter } from './adapters/FirebaseAnalyticsAdapter';
import { NoopAnalyticsAdapter } from './adapters/NoopAnalyticsAdapter';
import { isFirebaseConfigured } from './firebase/config';
import { useGameSession } from './app/useGameSession';
import { useMultiplayer } from './app/useMultiplayer';
import { StartScreen } from './app/StartScreen';
import { CountdownScreen } from './app/CountdownScreen';
import { GameScreen } from './app/GameScreen';
import { EndScreen } from './app/EndScreen';
import { MultiplayerLobbyScreen } from './app/MultiplayerLobbyScreen';

const clock = new BrowserClockAdapter();
const storage = new LocalStorageAdapter();
const firebaseReady = isFirebaseConfigured();
const multiplayer = firebaseReady ? new FirebaseMultiplayerAdapter() : new NoopMultiplayerAdapter();
const analytics = firebaseReady ? new FirebaseAnalyticsAdapter() : new NoopAnalyticsAdapter();

type AppMode = 'solo' | 'multiplayer';
type LobbyMode = 'quick' | 'create' | 'join';

export default function App() {
  const { gameState, logicalTime, bestScore, dispatchAction } = useGameSession(clock, storage);
  const mp = useMultiplayer(multiplayer, firebaseReady);

  const [appMode, setAppMode] = useState<AppMode>('solo');
  const [lobbyMode, setLobbyMode] = useState<LobbyMode>('quick');
  const [showCountdown, setShowCountdown] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const prevScoreRef = useRef(0);
  const matchStartedRef = useRef(false);
  const roundRef = useRef(0);

  const deepLinkHandled = useRef(false);
  useEffect(() => {
    analytics.track('app_open');

    // Handle deep link: ?join=CODE (only once)
    if (deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && firebaseReady) {
      deepLinkHandled.current = true;
      roundRef.current = 0;
      // Clear the URL param so refresh doesn't re-join
      window.history.replaceState({}, '', window.location.pathname);
      setAppMode('multiplayer');
      setLobbyMode('join');
      analytics.track('mp_room_joined', { via: 'deep_link' });
      void mp.joinRoom(joinCode);
    }
  }, [mp]);

  const isMultiplayer = appMode === 'multiplayer';

  const startMatch = useCallback(
    (seed: string) => {
      dispatchAction({ type: 'START_MATCH', seed, at: clock.now() });
      setShowCountdown(false);
      if (isMultiplayer) {
        mp.markPlaying();
        analytics.track('match_started', { mode: 'multiplayer' });
      } else {
        analytics.track('match_started', { mode: 'solo' });
      }
      matchStartedRef.current = true;
      prevScoreRef.current = 0;
    },
    [dispatchAction, isMultiplayer, mp],
  );

  const handlePlaySolo = useCallback(() => {
    analytics.track('mode_selected', { mode: 'solo' });
    setAppMode('solo');
    setShowCountdown(true);
  }, []);

  const handleQuickMatch = useCallback(() => {
    analytics.track('mode_selected', { mode: 'quick' });
    roundRef.current = 0;
    setAppMode('multiplayer');
    setLobbyMode('quick');
    analytics.track('mp_search_started');
    void mp.quickMatch();
  }, [mp]);

  const handleCreateRoom = useCallback(() => {
    analytics.track('mode_selected', { mode: 'create_room' });
    roundRef.current = 0;
    setAppMode('multiplayer');
    setLobbyMode('create');
    analytics.track('mp_room_created');
    void mp.createRoom();
  }, [mp]);

  const handleJoinRoomLobby = useCallback(() => {
    analytics.track('mode_selected', { mode: 'join_room' });
    roundRef.current = 0;
    setAppMode('multiplayer');
    setLobbyMode('join');
  }, []);

  const handleJoinRoom = useCallback(
    (code: string) => {
      analytics.track('mp_room_joined');
      void mp.joinRoom(code);
    },
    [mp],
  );

  const handleCancelLobby = useCallback(() => {
    void mp.cancel();
    setAppMode('solo');
  }, [mp]);

  const handleScoreChange = useCallback(
    (score: number) => {
      if (!isMultiplayer) return;
      void mp.publishScore(score);
      if (score > prevScoreRef.current) {
        analytics.track('point_scored', { mode: 'multiplayer', score });
      }
      prevScoreRef.current = score;
    },
    [isMultiplayer, mp],
  );

  const handlePlayAgain = useCallback(() => {
    if (isMultiplayer) {
      // Rematch reuses the SAME match doc. Just mark ourselves ready; when both
      // players are ready the doc resets (new seed, scores 0, round++) and the
      // round-change effect below starts the new game for both clients.
      setIsRematching(true);
      analytics.track('mp_rematch_requested');
      void mp.requestRematch();
    } else {
      dispatchAction({ type: 'RESET' });
      setShowCountdown(true);
    }
  }, [isMultiplayer, mp, dispatchAction]);

  const handleBackToMenu = useCallback(() => {
    roundRef.current = 0;
    setIsRematching(false);
    void mp.reset();
    setAppMode('solo');
    dispatchAction({ type: 'RESET' });
  }, [mp, dispatchAction]);

  // When match ends, track analytics and publish final score
  useEffect(() => {
    if (gameState.matchStatus !== 'ended' || !matchStartedRef.current) return;

    const localScore = gameState.players['local']?.score ?? 0;

    if (isMultiplayer) {
      void mp.publishScore(localScore);
      mp.markEnded();
      const result = mp.getResult(localScore);
      analytics.track('match_ended', {
        mode: 'multiplayer',
        score: localScore,
        opponent_score: mp.opponentScore,
        result: result ?? 'tie',
      });
    } else {
      analytics.track('match_ended', { mode: 'solo', score: localScore });
    }

    matchStartedRef.current = false;
  }, [gameState.matchStatus, gameState.players, isMultiplayer, mp]);

  // Start countdown when multiplayer match is ready
  useEffect(() => {
    console.log('[App] ready-check effect — isMultiplayer=', isMultiplayer, 'phase=', mp.phase, 'showCountdown=', showCountdown, 'matchStatus=', gameState.matchStatus);
    if (isMultiplayer && mp.phase === 'ready' && !showCountdown && gameState.matchStatus === 'idle') {
      console.log('[App] → starting countdown!');
      setShowCountdown(true);
    }
  }, [isMultiplayer, mp.phase, showCountdown, gameState.matchStatus]);

  // Detect a rematch: the SAME match doc bumped its round (new seed, scores 0).
  // Both clients react here and start the new game from the shared seed.
  useEffect(() => {
    if (!isMultiplayer || mp.round === 0) return;
    if (roundRef.current === 0) {
      // First round of this session — adopt without triggering a restart.
      roundRef.current = mp.round;
      return;
    }
    if (mp.round > roundRef.current) {
      console.log('[App] rematch detected — round', roundRef.current, '->', mp.round);
      roundRef.current = mp.round;
      setIsRematching(false);
      dispatchAction({ type: 'RESET' });
      setShowCountdown(true);
    }
  }, [isMultiplayer, mp.round, dispatchAction]);

  // If the opponent leaves while we're waiting for a rematch, bail to the menu.
  useEffect(() => {
    if (isRematching && isMultiplayer && mp.matchConfig && !mp.opponentPresent) {
      console.log('[App] opponent left during rematch wait — returning to menu');
      handleBackToMenu();
    }
  }, [isRematching, isMultiplayer, mp.matchConfig, mp.opponentPresent, handleBackToMenu]);

  const getMatchSeed = useCallback(() => {
    if (isMultiplayer && mp.matchConfig?.seed) return mp.matchConfig.seed;
    return String(clock.now());
  }, [isMultiplayer, mp.matchConfig?.seed]);

  if (isMultiplayer && (isRematching || mp.phase === 'searching' || mp.phase === 'waiting')) {
    return (
      <MultiplayerLobbyScreen
        mode={lobbyMode}
        inviteCode={mp.inviteCode}
        opponentName={mp.opponentName}
        error={mp.error}
        isSearching={isRematching || mp.phase === 'searching'}
        isRematch={isRematching}
        onCancel={handleCancelLobby}
        onJoin={handleJoinRoom}
      />
    );
  }

  if (isMultiplayer && lobbyMode === 'join' && mp.phase === 'idle' && !showCountdown) {
    return (
      <MultiplayerLobbyScreen
        mode="join"
        inviteCode={null}
        opponentName=""
        error={mp.error}
        onCancel={handleCancelLobby}
        onJoin={handleJoinRoom}
      />
    );
  }

  if (showCountdown) {
    return (
      <CountdownScreen
        onComplete={() => startMatch(getMatchSeed())}
        opponentName={isMultiplayer ? mp.opponentName : undefined}
      />
    );
  }

  if (gameState.matchStatus === 'idle') {
    return (
      <StartScreen
        bestScore={bestScore}
        multiplayerAvailable={firebaseReady}
        onPlaySolo={handlePlaySolo}
        onQuickMatch={handleQuickMatch}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoomLobby}
      />
    );
  }

  if (gameState.matchStatus === 'playing') {
    return (
      <GameScreen
        gameState={gameState}
        logicalTime={logicalTime}
        bestScore={bestScore}
        onDispatch={dispatchAction}
        clock={clock}
        isMultiplayer={isMultiplayer}
        opponentScore={mp.opponentScore}
        opponentName={mp.opponentName}
        onScoreChange={handleScoreChange}
      />
    );
  }

  return (
    <EndScreen
      score={gameState.players['local']?.score ?? 0}
      bestScore={bestScore}
      onPlayAgain={handlePlayAgain}
      onBackToMenu={isMultiplayer ? handleBackToMenu : undefined}
      isMultiplayer={isMultiplayer}
      opponentScore={mp.opponentScore}
      opponentName={mp.opponentName}
      opponentWantsRematch={isMultiplayer && mp.opponentWantsRematch}
      result={isMultiplayer ? mp.getResult(gameState.players['local']?.score ?? 0) : null}
    />
  );
}
