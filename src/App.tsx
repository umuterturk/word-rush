import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserClockAdapter } from './adapters/BrowserClockAdapter';
import { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
import { FirebaseMultiplayerAdapter } from './adapters/FirebaseMultiplayerAdapter';
import { NoopMultiplayerAdapter } from './adapters/NoopMultiplayerAdapter';
import { FirebaseLeaderboardAdapter } from './adapters/FirebaseLeaderboardAdapter';
import { NoopLeaderboardAdapter } from './adapters/NoopLeaderboardAdapter';
import { FirebaseWordReportAdapter } from './adapters/FirebaseWordReportAdapter';
import { NoopWordReportAdapter } from './adapters/NoopWordReportAdapter';
import { FirebaseAnalyticsAdapter } from './adapters/FirebaseAnalyticsAdapter';
import { NoopAnalyticsAdapter } from './adapters/NoopAnalyticsAdapter';
import { isFirebaseConfigured } from './firebase/config';
import type { SoloDifficulty } from './domain/types';
import type { SavedGameSession } from './domain/savedGameSession';
import { useGameSession, type GameSessionExtras } from './app/useGameSession';
import { useMultiplayer } from './app/useMultiplayer';
import { shareInviteLink } from './app/shareInvite';
import { useI18n } from './i18n';
import { StartScreen } from './app/StartScreen';
import { CountdownScreen } from './app/CountdownScreen';
import { GameScreen } from './app/GameScreen';
import { EndScreen } from './app/EndScreen';
import { ProfilePopup } from './app/ProfilePopup';
import { MultiplayerLobbyScreen } from './app/MultiplayerLobbyScreen';
import { FriendMatchOverlay } from './app/FriendMatchOverlay';
import { RoomUnavailableScreen } from './app/RoomUnavailableScreen';
import { useAppUpdate } from './app/useAppUpdate';
import { usePlayerProfile } from './app/usePlayerProfile';
import { useLeaderboard } from './app/useLeaderboard';
import {
  clearJoinGameParam,
  clearSoloGameParam,
  getJoinCodeFromUrl,
  setJoinGameParam,
  setSoloGameParam,
} from './app/gameUrl';
import { ensureWordListLoaded, type WordLanguage } from './domain/wordSet';
import { brokeLocalRecord, wouldQualifyForLeaderboard } from './app/victoryCelebration';

const clock = new BrowserClockAdapter();
const storage = new LocalStorageAdapter();
const firebaseReady = isFirebaseConfigured();
const multiplayer = firebaseReady ? new FirebaseMultiplayerAdapter() : new NoopMultiplayerAdapter();
const leaderboard = firebaseReady ? new FirebaseLeaderboardAdapter() : new NoopLeaderboardAdapter();
const wordReport = firebaseReady ? new FirebaseWordReportAdapter() : new NoopWordReportAdapter();
const analytics = firebaseReady ? new FirebaseAnalyticsAdapter() : new NoopAnalyticsAdapter();

type AppMode = 'solo' | 'multiplayer';
type LobbyMode = 'quick' | 'create' | 'join';
type FriendMatchPhase = 'creating' | 'sharing' | 'waiting' | 'found';

export default function App() {
  const { t, language } = useI18n();
  const { username, saveUsername } = usePlayerProfile(storage);
  const { entries: leaderboardEntries, loading: leaderboardLoading, refresh: refreshLeaderboard } =
    useLeaderboard(leaderboard);
  const mp = useMultiplayer(multiplayer, firebaseReady);

  const [appMode, setAppMode] = useState<AppMode>('solo');
  const [lobbyMode, setLobbyMode] = useState<LobbyMode>('quick');
  const [friendMatchPhase, setFriendMatchPhase] = useState<FriendMatchPhase | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [soloDifficulty, setSoloDifficulty] = useState<SoloDifficulty>('normal');
  const [isRematching, setIsRematching] = useState(false);
  const [gameUnavailable, setGameUnavailable] = useState(false);
  const [shuffleSignal, setShuffleSignal] = useState(0);
  const [endProfileDismissed, setEndProfileDismissed] = useState(false);
  const [loadedWordLanguage, setLoadedWordLanguage] = useState<WordLanguage | null>(null);

  const activeMatchIdRef = useRef<string | undefined>(undefined);
  const prevScoreRef = useRef(0);
  const matchStartedRef = useRef(false);
  const roundRef = useRef(0);
  const lastShuffleNonceRef = useRef(0);
  const matchEndedAtRef = useRef(0);
  const wasPlayingRef = useRef(false);

  const isMultiplayer = appMode === 'multiplayer';

  const getSessionExtras = useCallback(
    (): GameSessionExtras => ({
      matchId: isMultiplayer ? (mp.matchConfig?.matchId ?? activeMatchIdRef.current) : undefined,
      inviteCode: isMultiplayer ? (mp.inviteCode ?? undefined) : undefined,
      lastShuffleNonce: lastShuffleNonceRef.current,
      prevPublishedScore: prevScoreRef.current,
    }),
    [isMultiplayer, mp.matchConfig?.matchId, mp.inviteCode],
  );

  const handleSessionRestored = useCallback(
    (session: SavedGameSession) => {
      setAppMode(session.gameState.matchMode === 'multiplayer' ? 'multiplayer' : 'solo');
      if (session.gameState.soloDifficulty) {
        setSoloDifficulty(session.gameState.soloDifficulty);
      }
      if (session.lastShuffleNonce !== undefined) {
        lastShuffleNonceRef.current = session.lastShuffleNonce;
      }
      if (session.prevPublishedScore !== undefined) {
        prevScoreRef.current = session.prevPublishedScore;
      }
      matchStartedRef.current = true;
      setShowCountdown(false);
      setIsRematching(false);
      setFriendMatchPhase(null);
      setInviteCopied(false);
      setGameUnavailable(false);
      activeMatchIdRef.current = session.matchId;

      if (session.matchId && firebaseReady) {
        void mp.rejoinMatch(session.matchId).then(() => {
          mp.markPlaying();
        });
      }
    },
    [mp],
  );

  const { gameState, logicalTime, gameClockNow, bestScore, hydrated, dispatchAction, setGamePaused } =
    useGameSession(
    clock,
    storage,
    {
      getSessionExtras,
      onRestored: handleSessionRestored,
    },
  );

  const isMainMenu = gameState.matchStatus === 'idle' && !showCountdown;
  useAppUpdate(isMainMenu);

  useEffect(() => {
    multiplayer.setDisplayName(username);
  }, [username]);

  const deepLinkHandled = useRef(false);
  useEffect(() => {
    analytics.track('app_open');

    // Handle deep link: ?join=CODE (only once)
    if (deepLinkHandled.current) return;
    const joinCode = getJoinCodeFromUrl();
    if (joinCode && firebaseReady) {
      deepLinkHandled.current = true;
      roundRef.current = 0;
      setAppMode('multiplayer');
      setLobbyMode('join');
      analytics.track('mp_room_joined', { via: 'deep_link' });
      void mp.joinRoom(joinCode);
    }
  }, [mp]);

  useEffect(() => {
    if (lobbyMode !== 'join' || mp.phase !== 'idle' || !mp.error) return;
    setGameUnavailable(true);
    void mp.cancel();
  }, [lobbyMode, mp.phase, mp.error, mp]);

  useEffect(() => {
    if (!hydrated) return;

    if (gameState.matchStatus === 'playing') {
      if (isMultiplayer) {
        if (mp.inviteCode) setJoinGameParam(mp.inviteCode);
      } else {
        setSoloGameParam();
      }
      wasPlayingRef.current = true;
      return;
    }

    if (wasPlayingRef.current) {
      if (isMultiplayer) {
        clearJoinGameParam();
      } else {
        clearSoloGameParam();
      }
      wasPlayingRef.current = false;
    }
  }, [hydrated, gameState.matchStatus, isMultiplayer, mp.inviteCode]);

  const startMatch = useCallback(
    (seed: string) => {
      dispatchAction({
        type: 'START_MATCH',
        seed,
        at: clock.now(),
        mode: isMultiplayer ? 'multiplayer' : 'solo',
        language,
        difficulty: isMultiplayer ? undefined : soloDifficulty,
      });
      setShowCountdown(false);
      if (isMultiplayer) {
        mp.markPlaying();
        activeMatchIdRef.current = mp.matchConfig?.matchId;
        analytics.track('match_started', { mode: 'multiplayer' });
      } else {
        analytics.track('match_started', { mode: 'solo', difficulty: soloDifficulty });
      }
      matchStartedRef.current = true;
      prevScoreRef.current = 0;
      lastShuffleNonceRef.current = 0;
    },
    [dispatchAction, isMultiplayer, language, mp, soloDifficulty],
  );

  const handlePlaySolo = useCallback((difficulty: SoloDifficulty) => {
    analytics.track('mode_selected', { mode: 'solo', difficulty });
    setAppMode('solo');
    setSoloDifficulty(difficulty);
    setShowCountdown(true);
  }, []);

  const handleCreateRoom = useCallback(async () => {
    setGameUnavailable(false);
    analytics.track('mode_selected', { mode: 'create_room' });
    roundRef.current = 0;
    setAppMode('multiplayer');
    setLobbyMode('create');
    setFriendMatchPhase('creating');
    setInviteCopied(false);
    analytics.track('mp_room_created');

    const code = await mp.createRoom();
    if (!code) return;

    setFriendMatchPhase('sharing');
    const shareResult = await shareInviteLink(code, t.shareTitle, t.shareText);
    setInviteCopied(shareResult === 'copied');
    setFriendMatchPhase('waiting');
  }, [mp, t]);

  const handleJoinRoom = useCallback(
    (code: string) => {
      analytics.track('mp_room_joined');
      void mp.joinRoom(code);
    },
    [mp],
  );

  const handleDismissUnavailable = useCallback(() => {
    setGameUnavailable(false);
    setAppMode('solo');
    setLobbyMode('quick');
  }, []);

  const handleCancelLobby = useCallback(() => {
    void mp.cancel();
    setFriendMatchPhase(null);
    setInviteCopied(false);
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

  const handleShuffleAttack = useCallback(() => {
    if (!isMultiplayer) return;
    const player = gameState.players['local'];
    if (!player || player.shuffleUsed) return;
    dispatchAction({ type: 'MARK_SHUFFLE_USED', playerId: 'local' });
    void mp.sendShuffle();
    analytics.track('mp_shuffle_sent');
  }, [isMultiplayer, gameState.players, dispatchAction, mp]);

  const handlePlayAgain = useCallback(() => {
    if (clock.now() - matchEndedAtRef.current < 500) return;

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
    activeMatchIdRef.current = undefined;
    clearSoloGameParam();
    clearJoinGameParam();
    setIsRematching(false);
    setGameUnavailable(false);
    setFriendMatchPhase(null);
    setInviteCopied(false);
    void mp.reset();
    setAppMode('solo');
    dispatchAction({ type: 'RESET' });
  }, [mp, dispatchAction]);

  const completeSoloVictoryExit = useCallback(
    (action: 'playAgain' | 'menu') => {
      dispatchAction({ type: 'END_MATCH', at: clock.now() });
      window.setTimeout(() => {
        if (action === 'playAgain') {
          dispatchAction({ type: 'RESET' });
          setShowCountdown(true);
        } else {
          handleBackToMenu();
        }
      }, 0);
    },
    [clock, dispatchAction, handleBackToMenu],
  );

  const handleSoloVictoryDone = useCallback(
    (action: 'playAgain' | 'menu') => {
      completeSoloVictoryExit(action);
    },
    [completeSoloVictoryExit],
  );

  const handleVictoryUsernameSave = useCallback(
    (name: string, score: number) => {
      saveUsername(name);
      if (score > 0 && name.trim()) {
        void leaderboard.submitScore(name.trim(), score).then(() => refreshLeaderboard());
      }
    },
    [saveUsername, refreshLeaderboard],
  );

  const handleQuitGame = useCallback(() => {
    matchStartedRef.current = false;
    activeMatchIdRef.current = undefined;
    clearSoloGameParam();
    clearJoinGameParam();
    if (isMultiplayer) {
      void mp.reset();
    }
    roundRef.current = 0;
    setIsRematching(false);
    setFriendMatchPhase(null);
    setInviteCopied(false);
    setShowCountdown(false);
    setAppMode('solo');
    dispatchAction({ type: 'RESET' });
  }, [isMultiplayer, mp, dispatchAction]);

  const handleReportWord = useCallback(
    (word: string, wordLanguage: 'tr' | 'en') => wordReport.reportWord(word, wordLanguage),
    [],
  );

  useEffect(() => {
    if (gameState.matchStatus === 'ended') {
      matchEndedAtRef.current = clock.now();
    }
  }, [gameState.matchStatus]);

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
      if (localScore > 0 && username.trim()) {
        void leaderboard.submitScore(username.trim(), localScore).then(() => refreshLeaderboard());
      }
    }

    matchStartedRef.current = false;
  }, [
    gameState.matchStatus,
    gameState.players,
    isMultiplayer,
    mp,
    username,
    refreshLeaderboard,
  ]);

  // Apply an incoming shuffle attack: the opponent scrambled our board.
  useEffect(() => {
    if (!isMultiplayer || gameState.matchStatus !== 'playing') return;
    const nonce = mp.incomingShuffleNonce;
    if (nonce > lastShuffleNonceRef.current) {
      lastShuffleNonceRef.current = nonce;
      dispatchAction({ type: 'SHUFFLE_BOARD', playerId: 'local' });
      setShuffleSignal(s => s + 1);
      analytics.track('mp_shuffle_received');
    }
  }, [isMultiplayer, mp.incomingShuffleNonce, gameState.matchStatus, dispatchAction]);

  // Start countdown when multiplayer match is ready
  useEffect(() => {
    console.log('[App] ready-check effect — isMultiplayer=', isMultiplayer, 'phase=', mp.phase, 'showCountdown=', showCountdown, 'matchStatus=', gameState.matchStatus);
    if (isMultiplayer && mp.phase === 'ready' && !showCountdown && gameState.matchStatus === 'idle') {
      console.log('[App] → starting countdown!');
      setShowCountdown(true);
    }
  }, [isMultiplayer, mp.phase, showCountdown, gameState.matchStatus]);

  useEffect(() => {
    if (friendMatchPhase === 'waiting' && mp.opponentName) {
      setFriendMatchPhase('found');
    }
  }, [friendMatchPhase, mp.opponentName]);

  useEffect(() => {
    if (showCountdown) {
      setFriendMatchPhase(null);
    }
  }, [showCountdown]);

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

  const handleCountdownComplete = useCallback(async () => {
    await ensureWordListLoaded(language);
    startMatch(getMatchSeed());
  }, [startMatch, getMatchSeed, language]);

  const requiredWordLanguage: WordLanguage | null =
    gameState.matchStatus === 'playing'
      ? gameState.language
      : showCountdown
        ? language
        : null;

  useEffect(() => {
    if (!requiredWordLanguage) {
      return;
    }

    let active = true;
    void ensureWordListLoaded(requiredWordLanguage).then(() => {
      if (active) setLoadedWordLanguage(requiredWordLanguage);
    });

    return () => {
      active = false;
    };
  }, [requiredWordLanguage]);

  const wordsReady =
    requiredWordLanguage !== null && loadedWordLanguage === requiredWordLanguage;

  useEffect(() => {
    if (gameState.matchStatus === 'idle') {
      setEndProfileDismissed(false);
    }
  }, [gameState.matchStatus]);

  const localScore = gameState.players['local']?.score ?? 0;
  const qualifiesForLeaderboardNamePrompt =
    localScore > 0 &&
    (brokeLocalRecord(localScore, bestScore) ||
      wouldQualifyForLeaderboard(localScore, leaderboardEntries));

  const showEndProfilePopup =
    gameState.matchStatus === 'ended' &&
    !isMultiplayer &&
    !username.trim() &&
    !endProfileDismissed &&
    qualifiesForLeaderboardNamePrompt;

  const handleEndProfileSave = useCallback(
    (name: string) => {
      saveUsername(name);
      if (localScore > 0 && name.trim()) {
        void leaderboard.submitScore(name.trim(), localScore).then(() => refreshLeaderboard());
      }
    },
    [saveUsername, localScore, refreshLeaderboard],
  );

  if (!hydrated) {
    return null;
  }

  if (gameUnavailable) {
    return (
      <RoomUnavailableScreen
        onInviteFriend={handleCreateRoom}
        onMainMenu={handleDismissUnavailable}
      />
    );
  }

  if (
    isMultiplayer &&
    (isRematching ||
      (lobbyMode === 'join' && (mp.phase === 'searching' || mp.phase === 'waiting')) ||
      (lobbyMode !== 'create' && lobbyMode !== 'join' && (mp.phase === 'searching' || mp.phase === 'waiting')))
  ) {
    return (
      <MultiplayerLobbyScreen
        mode={lobbyMode}
        opponentName={mp.opponentName}
        error={mp.error}
        isSearching={isRematching || mp.phase === 'searching'}
        isRematch={isRematching}
        onCancel={handleCancelLobby}
        onJoin={handleJoinRoom}
      />
    );
  }

  if (showCountdown) {
    return (
      <CountdownScreen
        onComplete={handleCountdownComplete}
        opponentName={isMultiplayer ? mp.opponentName : undefined}
        paused={!wordsReady}
      />
    );
  }

  if (gameState.matchStatus === 'idle') {
    const showFriendMatchOverlay =
      isMultiplayer &&
      lobbyMode === 'create' &&
      !showCountdown &&
      friendMatchPhase !== null;

    return (
      <>
        <StartScreen
          bestScore={bestScore}
          username={username}
          onSaveUsername={saveUsername}
          leaderboard={leaderboardEntries}
          leaderboardLoading={leaderboardLoading}
          multiplayerAvailable={firebaseReady}
          onPlaySolo={handlePlaySolo}
          onPlayWithFriend={handleCreateRoom}
        />
        {showFriendMatchOverlay && friendMatchPhase && (
          <FriendMatchOverlay
            phase={friendMatchPhase}
            inviteCopied={inviteCopied}
            error={mp.error}
            onCancel={handleCancelLobby}
          />
        )}
      </>
    );
  }

  if (gameState.matchStatus === 'playing') {
    if (!wordsReady) return null;

    return (
      <GameScreen
        gameState={gameState}
        logicalTime={logicalTime}
        gameClockNow={gameClockNow}
        onDispatch={dispatchAction}
        clock={clock}
        isMultiplayer={isMultiplayer}
        opponentScore={mp.opponentScore}
        opponentName={mp.opponentName}
        onScoreChange={handleScoreChange}
        onShuffle={handleShuffleAttack}
        shuffleSignal={shuffleSignal}
        onQuit={handleQuitGame}
        bestScore={bestScore}
        leaderboardEntries={leaderboardEntries}
        username={username}
        onVictoryUsernameSave={isMultiplayer ? undefined : handleVictoryUsernameSave}
        onSoloVictoryDone={isMultiplayer ? undefined : handleSoloVictoryDone}
        onReportWord={firebaseReady ? handleReportWord : undefined}
        setGamePaused={setGamePaused}
      />
    );
  }

  return (
    <>
      <EndScreen
        score={gameState.players['local']?.score ?? 0}
        bestScore={bestScore}
        onPlayAgain={handlePlayAgain}
        onBackToMenu={handleBackToMenu}
        isMultiplayer={isMultiplayer}
        opponentScore={mp.opponentScore}
        opponentName={mp.opponentName}
        opponentWantsRematch={isMultiplayer && mp.opponentWantsRematch}
        result={isMultiplayer ? mp.getResult(gameState.players['local']?.score ?? 0) : null}
      />
      {showEndProfilePopup && (
        <ProfilePopup
          username={username}
          message={t.leaderboardNamePrompt}
          onSave={handleEndProfileSave}
          onClose={() => setEndProfileDismissed(true)}
        />
      )}
    </>
  );
}
