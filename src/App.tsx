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
import { FirebaseFriendsAdapter } from './adapters/FirebaseFriendsAdapter';
import { NoopFriendsAdapter } from './adapters/NoopFriendsAdapter';
import { isFirebaseConfigured } from './firebase/config';
import type { SoloDifficulty } from './domain/types';
import type { FriendEntry } from './ports';
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
import { GameRequestModal } from './app/GameRequestModal';
import { useAppUpdate } from './app/useAppUpdate';
import { usePlayerProfile } from './app/usePlayerProfile';
import { useLeaderboard } from './app/useLeaderboard';
import { useFriends } from './app/useFriends';
import { useUserPresence } from './app/useUserPresence';
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
const friends = firebaseReady ? new FirebaseFriendsAdapter() : new NoopFriendsAdapter();

type AppMode = 'solo' | 'multiplayer';
type LobbyMode = 'quick' | 'create' | 'join';
type FriendMatchPhase = 'creating' | 'sharing' | 'waiting' | 'found';

/**
 * How long to wait for the opponent to publish their final score after our own
 * match ends before resolving the result anyway. Covers a closed tab / lost
 * connection so the winner isn't stuck on a "waiting" screen forever.
 */
const END_SETTLE_TIMEOUT_MS = 6_000;

export default function App() {
  const { t, language } = useI18n();
  const { username, saveUsername } = usePlayerProfile(storage);
  const {
    allTimeEntries: leaderboardEntries,
    todayEntries: todayLeaderboardEntries,
    weeklyEntries: weeklyLeaderboardEntries,
    loading: leaderboardLoading,
    refresh: refreshLeaderboard,
  } = useLeaderboard(leaderboard);
  const mp = useMultiplayer(multiplayer, firebaseReady);
  const {
    friendList,
    loading: friendsLoading,
    incomingRequest,
    refresh: refreshFriends,
    addFriend,
    isFriend,
    recordMatchResult,
    sendChallenge,
    acceptRequest,
    declineRequest,
  } = useFriends(friends, firebaseReady);

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
  const [challengingUid, setChallengingUid] = useState<string | null>(null);
  const [endSettleTimedOut, setEndSettleTimedOut] = useState(false);

  const activeMatchIdRef = useRef<string | undefined>(undefined);
  const prevScoreRef = useRef(0);
  const matchStartedRef = useRef(false);
  const roundRef = useRef(0);
  const lastShuffleNonceRef = useRef(0);
  const matchEndedAtRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const rivalRecordedKeyRef = useRef<string | null>(null);
  const addFriendCheckedRef = useRef<string | null>(null);

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

  const presenceMatchId = isMultiplayer ? mp.matchConfig?.matchId : undefined;

  useUserPresence(
    friends,
    username,
    gameState.matchStatus === 'playing',
    presenceMatchId,
    firebaseReady,
  );

  const isMainMenu = gameState.matchStatus === 'idle' && !showCountdown;
  useAppUpdate(isMainMenu);

  useEffect(() => {
    multiplayer.setDisplayName(username);
  }, [username]);

  useEffect(() => {
    analytics.track('app_open');
  }, []);

  const deepLinkHandled = useRef(false);
  useEffect(() => {
    // Handle the ?join=CODE deep link exactly once, on first load. We must
    // claim the guard *before* reading the URL: once a match starts, our own
    // game writes ?join=<our code> into the URL (see setJoinGameParam below),
    // and this effect re-runs whenever `mp` changes (e.g. on every score
    // snapshot). Without the early guard the creator would re-read that param
    // and try to join their own already-started room, which fails and trips
    // the GAME UNAVAILABLE screen.
    if (deepLinkHandled.current || !firebaseReady) return;
    deepLinkHandled.current = true;

    const joinCode = getJoinCodeFromUrl();
    if (!joinCode) return;
    roundRef.current = 0;
    setAppMode('multiplayer');
    setLobbyMode('join');
    analytics.track('mp_room_joined', { via: 'deep_link' });
    void mp.joinRoom(joinCode);
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
        matchDuration: isMultiplayer ? mp.matchConfig?.matchDuration : undefined,
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
    [dispatchAction, isMultiplayer, language, mp.matchConfig?.matchDuration, mp, soloDifficulty],
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
    setChallengingUid(null);
    rivalRecordedKeyRef.current = null;
    addFriendCheckedRef.current = null;
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
      void mp.reset(true);
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

  const handleChallengeFriend = useCallback(
    async (friend: FriendEntry) => {
      setChallengingUid(friend.uid);
      setGameUnavailable(false);
      analytics.track('friend_challenge_sent');
      setAppMode('multiplayer');
      setLobbyMode('create');
      setFriendMatchPhase('waiting');

      try {
        const code = await mp.createRoom();
        const matchId = multiplayer.getActiveMatchId();
        if (!code || !matchId) {
          setFriendMatchPhase(null);
          setAppMode('solo');
          return;
        }
        await sendChallenge(friend.uid, matchId, code);
      } catch {
        setFriendMatchPhase(null);
        void mp.cancel();
        setAppMode('solo');
      } finally {
        setChallengingUid(null);
      }
    },
    [mp, sendChallenge],
  );

  const handleAcceptGameRequest = useCallback(async () => {
    const request = incomingRequest;
    if (!request) return;

    if (showCountdown) {
      setShowCountdown(false);
      dispatchAction({ type: 'RESET' });
    } else if (gameState.matchStatus === 'playing') {
      handleQuitGame();
    } else if (gameState.matchStatus === 'ended') {
      handleBackToMenu();
    }

    await acceptRequest(request.id);
    await mp.reset();
    setAppMode('multiplayer');
    setLobbyMode('join');
    setGameUnavailable(false);
    analytics.track('friend_challenge_accepted');
    try {
      await mp.joinRoom(request.inviteCode);
    } catch {
      setGameUnavailable(true);
    }
  }, [
    incomingRequest,
    showCountdown,
    gameState.matchStatus,
    dispatchAction,
    handleQuitGame,
    handleBackToMenu,
    acceptRequest,
    mp,
  ]);

  const handleDeclineGameRequest = useCallback(async () => {
    const request = incomingRequest;
    if (!request) return;
    await declineRequest(request.id);
    analytics.track('friend_challenge_declined');
  }, [incomingRequest, declineRequest]);

  const globalOverlays = (
    <>
      {incomingRequest && (
        <GameRequestModal
          request={incomingRequest}
          onAccept={() => void handleAcceptGameRequest()}
          onDecline={() => void handleDeclineGameRequest()}
        />
      )}
    </>
  );

  useEffect(() => {
    if (gameState.matchStatus === 'ended') {
      matchEndedAtRef.current = clock.now();
    }
  }, [gameState.matchStatus]);

  // When the match ends locally, publish our final score immediately. In
  // multiplayer we mark ourselves "done" rather than reporting the result yet —
  // the result is only resolved once BOTH players are done (see resultSettled),
  // so clients that finish a beat apart still agree on win/lose.
  useEffect(() => {
    if (gameState.matchStatus !== 'ended' || !matchStartedRef.current) return;

    const localScore = gameState.players['local']?.score ?? 0;

    if (isMultiplayer) {
      void mp.markDone(localScore);
      mp.markEnded();
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

  // The multiplayer result is "settled" once the opponent has also finished
  // (done), resigned, left, or we've waited long enough for a silent opponent.
  // Until then we don't record W/L or show a result, because the opponent's
  // score may still climb in the final second of their (slightly later) timer.
  const matchEnded = gameState.matchStatus === 'ended';
  const resultSettled =
    !isMultiplayer ||
    !matchEnded ||
    mp.opponentDone ||
    mp.opponentResigned ||
    !mp.opponentPresent ||
    endSettleTimedOut;

  useEffect(() => {
    if (!isMultiplayer || !matchEnded) {
      setEndSettleTimedOut(false);
      return;
    }
    if (endSettleTimedOut || mp.opponentDone || mp.opponentResigned || !mp.opponentPresent) return;
    const timer = window.setTimeout(() => setEndSettleTimedOut(true), END_SETTLE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [
    isMultiplayer,
    matchEnded,
    endSettleTimedOut,
    mp.opponentDone,
    mp.opponentResigned,
    mp.opponentPresent,
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

  // End the local game when the opponent resigns mid-match.
  useEffect(() => {
    if (!isMultiplayer || !mp.opponentResigned) return;
    if (gameState.matchStatus !== 'playing') return;
    dispatchAction({ type: 'END_MATCH', at: clock.now() });
  }, [isMultiplayer, mp.opponentResigned, gameState.matchStatus, dispatchAction]);

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

  useEffect(() => {
    if (gameState.matchStatus !== 'ended' || !isMultiplayer) return;
    // Wait for both players' final scores before recording the outcome.
    if (!resultSettled) return;

    const opponentUid = mp.matchConfig?.opponentUid;
    const matchId = mp.matchConfig?.matchId;
    if (!opponentUid || !matchId) return;

    const key = `${matchId}-r${mp.round}`;
    if (rivalRecordedKeyRef.current === key) return;
    rivalRecordedKeyRef.current = key;

    const score = gameState.players['local']?.score ?? 0;
    const result = mp.getResult(score);
    if (!result) return;

    analytics.track('match_ended', {
      mode: 'multiplayer',
      score,
      opponent_score: mp.opponentScore,
      result,
    });

    void recordMatchResult(opponentUid, mp.opponentName, result, matchId).then(() =>
      refreshFriends(),
    );
  }, [
    gameState.matchStatus,
    gameState.players,
    isMultiplayer,
    resultSettled,
    mp.matchConfig?.opponentUid,
    mp.matchConfig?.matchId,
    mp.opponentName,
    mp.opponentScore,
    mp.round,
    mp,
    recordMatchResult,
    refreshFriends,
  ]);

  useEffect(() => {
    if (gameState.matchStatus !== 'ended' || !isMultiplayer) return;
    if (lobbyMode !== 'create' && lobbyMode !== 'join') return;

    const opponentUid = mp.matchConfig?.opponentUid;
    const matchId = mp.matchConfig?.matchId;
    if (!opponentUid || !matchId) return;

    const checkKey = `${matchId}-${opponentUid}`;
    if (addFriendCheckedRef.current === checkKey) return;
    addFriendCheckedRef.current = checkKey;

    void isFriend(opponentUid).then(already => {
      if (already) return;
      const opponentName =
        mp.opponentName || `Player ${opponentUid.slice(-4).toUpperCase()}`;
      void addFriend(opponentUid, opponentName).then(() => {
        analytics.track('friend_added');
        void refreshFriends();
      });
    });
  }, [
    gameState.matchStatus,
    isMultiplayer,
    lobbyMode,
    mp.matchConfig?.opponentUid,
    mp.matchConfig?.matchId,
    mp.opponentName,
    isFriend,
    addFriend,
    refreshFriends,
  ]);

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
      <>
        <RoomUnavailableScreen
          onInviteFriend={handleCreateRoom}
          onMainMenu={handleDismissUnavailable}
        />
        {globalOverlays}
      </>
    );
  }

  if (
    isMultiplayer &&
    (isRematching ||
      (lobbyMode === 'join' && (mp.phase === 'searching' || mp.phase === 'waiting')))
  ) {
    return (
      <>
        <MultiplayerLobbyScreen
          mode={lobbyMode}
          error={mp.error}
          isSearching={isRematching || mp.phase === 'searching'}
          isRematch={isRematching}
          onCancel={handleCancelLobby}
          onJoin={handleJoinRoom}
        />
        {globalOverlays}
      </>
    );
  }

  if (showCountdown) {
    return (
      <>
        <CountdownScreen
          onComplete={handleCountdownComplete}
          opponentName={isMultiplayer ? mp.opponentName : undefined}
          paused={!wordsReady}
        />
        {globalOverlays}
      </>
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
          weeklyLeaderboard={weeklyLeaderboardEntries}
          todayLeaderboard={todayLeaderboardEntries}
          allTimeLeaderboard={leaderboardEntries}
          leaderboardLoading={leaderboardLoading}
          multiplayerAvailable={firebaseReady}
          friendsAvailable={firebaseReady}
          friends={friendList}
          friendsLoading={friendsLoading}
          challengingUid={challengingUid}
          onPlaySolo={handlePlaySolo}
          onPlayWithFriend={handleCreateRoom}
          onChallengeFriend={handleChallengeFriend}
        />
        {showFriendMatchOverlay && friendMatchPhase && (
          <FriendMatchOverlay
            phase={friendMatchPhase}
            inviteCopied={inviteCopied}
            error={mp.error}
            onCancel={handleCancelLobby}
          />
        )}
        {globalOverlays}
      </>
    );
  }

  if (gameState.matchStatus === 'playing') {
    if (!wordsReady) return null;

    return (
      <>
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
        {globalOverlays}
      </>
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
        opponentResigned={isMultiplayer && mp.opponentResigned}
        result={isMultiplayer ? mp.getResult(gameState.players['local']?.score ?? 0) : null}
        resolving={isMultiplayer && !resultSettled}
      />
      {showEndProfilePopup && (
        <ProfilePopup
          username={username}
          message={t.leaderboardNamePrompt}
          onSave={handleEndProfileSave}
          onClose={() => setEndProfileDismissed(true)}
        />
      )}
      {globalOverlays}
    </>
  );
}
