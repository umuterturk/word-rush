import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameAction, GameState } from '../domain/types';
import { GRID_COLS, GRID_ROWS, SKIP_PENALTY, LETTER_HINT_DELAY_MS } from '../domain/constants';
import type { ClockPort, LeaderboardEntry } from '../ports';
import { useI18n } from '../i18n';
import { getPlayerWordDuration, formatDoubleBonusMultiplierLabel, findHintCellId, getCellById, isCorrectNextLetter, computeWordPoints, buildVictoryAlphabetGrid } from '../domain/gridUtils';
import { createSeededRng } from '../domain/seededRng';
import { upperByLanguage } from '../domain/turkishText';
import {
  SOLO_VICTORY_WAIT_MS,
  CELEBRATION_STAGGER_MS,
  CELEBRATION_POPUP_DELAY_MS,
  CELEBRATION_TILE_POP_MS,
  VICTORY_POPUP_ACTION_DELAY_MS,
  brokeLocalRecord,
  devLeaderboardPreviewScore,
  devVictoryPreviewScore,
  getVictoryEpicBadgeLabel,
  getVictoryHonorMessage,
  isEpicVictoryCelebration,
  resolveVictoryHonorFocus,
  wouldQualifyForLeaderboard,
} from './victoryCelebration';

interface Props {
  gameState: GameState;
  logicalTime: number;
  onDispatch: (action: GameAction) => void;
  clock: ClockPort;
  isMultiplayer?: boolean;
  opponentScore?: number;
  opponentName?: string;
  onScoreChange?: (score: number) => void;
  /** Called when the local player fires their one-time shuffle attack. */
  onShuffle?: () => void;
  /** Increments whenever our own board was shuffled by the opponent (triggers animation). */
  shuffleSignal?: number;
  onQuit?: () => void;
  bestScore?: number;
  leaderboardEntries?: LeaderboardEntry[];
  onSoloVictoryDone?: (action: 'playAgain' | 'menu') => void;
}

function formatTime(ms: number): string {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

const TURKISH_VOWELS = new Set(['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü']);
const VOWEL_COLORS = ['#ffd54f', '#ffb74d', '#fff176'];
const CONSONANT_COLORS = ['#4fc3f7', '#4dd0e1', '#81c784', '#ce93d8', '#80cbc4'];

function tileColor(letter: string): string {
  const ch = Array.from(letter)[0] ?? '';
  const code = ch.charCodeAt(0);
  if (TURKISH_VOWELS.has(ch)) {
    return VOWEL_COLORS[code % VOWEL_COLORS.length];
  }
  return CONSONANT_COLORS[code % CONSONANT_COLORS.length];
}

/** Isolated letter node — immune to WebView auto-translate rewriting İ → "ben". */
function LetterGlyph({ letter, language }: { letter: string; language: 'tr' | 'en' }) {
  return (
    <span className="letter-glyph notranslate" translate="no">
      {upperByLanguage(letter, language)}
    </span>
  );
}

const TILE_BUTTON_ATTRS = {
  spellCheck: false,
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
} as const;

const COL_PCT = 100 / GRID_COLS;
const ROW_PCT = 100 / GRID_ROWS;
const CONFETTI_COLORS = ['#ffd54f', '#81c784', '#ce93d8', '#4fc3f7', '#ff8a65', '#fff176'];

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  color: string;
  size: number;
}

interface VictorySnapshot {
  score: number;
  previousBest: number;
  forceRecord: boolean;
  forceEpic: boolean;
}

function buildVictorySnapshot(
  score: number,
  storedBest: number,
  forceRecord: boolean,
  forceEpic: boolean,
  devPreview: boolean,
  leaderboardEntries: LeaderboardEntry[],
): VictorySnapshot {
  let resolvedScore = score;
  if (import.meta.env.DEV && devPreview && score <= 0) {
    if (forceRecord && !forceEpic) {
      resolvedScore = devVictoryPreviewScore(storedBest, leaderboardEntries);
    } else if (forceEpic && !forceRecord) {
      resolvedScore = devLeaderboardPreviewScore(storedBest, leaderboardEntries);
    } else {
      resolvedScore = devVictoryPreviewScore(storedBest, leaderboardEntries);
    }
  }

  let previousBest = storedBest;
  if (forceRecord && !brokeLocalRecord(resolvedScore, storedBest)) {
    previousBest = Math.max(0, resolvedScore - Math.max(12, Math.ceil(resolvedScore * 0.35)));
    if (previousBest >= resolvedScore) previousBest = resolvedScore - 1;
  }

  return { score: resolvedScore, previousBest, forceRecord, forceEpic };
}

interface FireworkSpark {
  angle: number;
  distance: number;
  color: string;
}

interface FireworkBurst {
  id: number;
  left: number;
  top: number;
  delay: number;
  rocketColor: string;
  flashColor: string;
  sparks: FireworkSpark[];
}

function buildFireworkBursts(seed: string, count: number): FireworkBurst[] {
  const rng = createSeededRng(`${seed}-fireworks`);
  const palette = ['#ffd54f', '#ff7043', '#81c784', '#e040fb', '#40c4ff', '#fff176', '#ffab91'];
  return Array.from({ length: count }, (_, id) => {
    const rocketColor = palette[Math.floor(rng() * palette.length)];
    const sparkCount = 16 + Math.floor(rng() * 12);
    const sparks = Array.from({ length: sparkCount }, () => ({
      angle: rng() * 360,
      distance: 28 + rng() * 52,
      color: palette[Math.floor(rng() * palette.length)],
    }));
    return {
      id,
      left: 4 + rng() * 92,
      top: 6 + rng() * 48,
      delay: rng() * 3.5,
      rocketColor,
      flashColor: rocketColor,
      sparks,
    };
  });
}

function VictoryFireworks({ bursts }: { bursts: FireworkBurst[] }) {
  return (
    <div className="victory-fireworks" aria-hidden="true">
      {bursts.map(burst => (
        <div
          key={burst.id}
          className="victory-firework"
          style={{
            left: `${burst.left}%`,
            top: `${burst.top}%`,
            '--fw-delay': `${burst.delay}s`,
            '--rocket-color': burst.rocketColor,
            '--flash-color': burst.flashColor,
          } as React.CSSProperties}
        >
          <span className="victory-firework-rocket" />
          <span className="victory-firework-flash" />
          {burst.sparks.map((spark, sparkIndex) => (
            <span
              key={sparkIndex}
              className="victory-firework-spark"
              style={{
                '--spark-angle': `${spark.angle}deg`,
                '--spark-dist': `${spark.distance}px`,
                '--spark-color': spark.color,
              } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function buildConfettiPieces(seed: string, count: number): ConfettiPiece[] {
  const rng = createSeededRng(`${seed}-confetti`);
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: rng() * 100,
    delay: rng() * 1.8,
    duration: 3 + rng() * 2.5,
    drift: -50 + rng() * 100,
    rotate: rng() * 360,
    color: CONFETTI_COLORS[Math.floor(rng() * CONFETTI_COLORS.length)],
    size: 5 + rng() * 7,
  }));
}

function celebrationTileDelay(col: number, rowFromTop: number): number {
  const centerCol = (GRID_COLS - 1) / 2;
  const centerRow = (GRID_ROWS - 1) / 2;
  return Math.round(Math.hypot(col - centerCol, rowFromTop - centerRow) * CELEBRATION_STAGGER_MS);
}

export function GameScreen({
  gameState,
  logicalTime,
  onDispatch,
  clock,
  isMultiplayer = false,
  opponentScore = 0,
  opponentName: _opponentName,
  onScoreChange,
  onShuffle,
  shuffleSignal = 0,
  onQuit,
  bestScore = 0,
  leaderboardEntries = [],
  onSoloVictoryDone,
}: Props) {
  const { t, language } = useI18n();
  const player = gameState.players['local'];
  const timeLeft = gameState.matchDuration - logicalTime;
  const isUrgent = isMultiplayer && timeLeft < 30_000;
  const elapsedTime = logicalTime;
  const displayScore = player?.score ?? 0;

  const selectedIds = player?.selectedIds ?? [];
  const selectedSet = new Set(selectedIds);
  const targetWord = player?.targetWord ?? '';
  
  // Word timer uses wall clock so it survives refresh (logicalTime is 0 until the first frame).
  const wordStartedAt = player?.wordStartedAt ?? 0;
  const wordDuration = player && targetWord
    ? getPlayerWordDuration(player, gameState.matchMode, gameState.soloDifficulty)
    : 0;
  const currentTime = clock.now();
  const wordElapsed = wordStartedAt > 0 ? Math.max(0, currentTime - wordStartedAt) : 0;
  const wordTimeLeft = Math.max(0, wordDuration - wordElapsed);
  const wordTimerKey = `${targetWord}-${wordStartedAt}`;
  const initialWordElapsed = useMemo(
    () => Math.min(wordDuration, Math.max(0, clock.now() - wordStartedAt)),
    [wordTimerKey, wordDuration, clock, wordStartedAt],
  );

  // Build letter map for the current word display
  const letterMap = new Map<string, string>();
  if (player) {
    for (const col of player.columns) {
      for (const cell of col) letterMap.set(cell.id, cell.letter);
    }
  }

  const formedWord = selectedIds.map(id => letterMap.get(id) ?? '').join('');
  const wordMatchesTarget = formedWord === targetWord && formedWord.length >= 3;
  const wordScore =
    wordMatchesTarget && player && targetWord
      ? computeWordPoints({
          word: targetWord,
          columns: player.columns,
          submittedAt: currentTime,
          wordStartedAt: player.wordStartedAt,
          matchMode: gameState.matchMode,
          player,
          soloDifficulty: gameState.soloDifficulty,
        }).total
      : 0;

  const [submitFeedback, setSubmitFeedback] = useState<'valid' | 'invalid' | null>(null);
  const [errorTileId, setErrorTileId] = useState<string | null>(null);
  const [hintCellId, setHintCellId] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<'idle' | 'wait' | 'celebrate'>('idle');
  const [celebrationGrid, setCelebrationGrid] = useState<ReturnType<typeof buildVictoryAlphabetGrid> | null>(null);
  const [showVictoryPopup, setShowVictoryPopup] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const [fireworkBursts, setFireworkBursts] = useState<FireworkBurst[]>([]);
  const [celebrationEpic, setCelebrationEpic] = useState(false);
  const [victorySnapshot, setVictorySnapshot] = useState<VictorySnapshot | null>(null);
  const forceEpicRef = useRef(false);
  const forceRecordRef = useRef(false);
  const devPreviewRef = useRef(false);
  const victoryRunRef = useRef(0);
  const [victoryActionsEnabled, setVictoryActionsEnabled] = useState(false);

  const isSoloVictory = !isMultiplayer && gameState.soloVictoryPending === true;
  const isCelebrating = celebrationPhase === 'celebrate';
  const snapshotScore = victorySnapshot?.score ?? displayScore;
  const snapshotPreviousBest = victorySnapshot?.previousBest ?? bestScore;
  const isNewBest =
    isSoloVictory &&
    victorySnapshot != null &&
    (victorySnapshot.forceRecord ||
      brokeLocalRecord(snapshotScore, snapshotPreviousBest));
  const qualifiesForLeaderboard =
    isSoloVictory &&
    wouldQualifyForLeaderboard(snapshotScore, leaderboardEntries);
  const honorFocus = victorySnapshot
    ? resolveVictoryHonorFocus(victorySnapshot.forceRecord, victorySnapshot.forceEpic)
    : 'both';
  const victoryHonorMessage =
    isSoloVictory && victorySnapshot && (isNewBest || qualifiesForLeaderboard)
      ? getVictoryHonorMessage(
          t,
          isNewBest,
          qualifiesForLeaderboard,
          snapshotScore,
          snapshotPreviousBest,
          honorFocus,
        )
      : null;
  const epicBadgeLabel =
    celebrationEpic && victorySnapshot
      ? getVictoryEpicBadgeLabel(
          { newBest: t.newBest, leaderboard: t.leaderboard },
          isNewBest,
          qualifiesForLeaderboard,
          honorFocus,
        )
      : null;

  // Auto-submit when the formed word exactly matches the target
  const prevFormedRef = useRef('');
  useEffect(() => {
    if (
      formedWord === targetWord &&
      formedWord.length >= 3 &&
      formedWord !== prevFormedRef.current
    ) {
      prevFormedRef.current = formedWord;
      setSubmitFeedback('valid');
      onDispatch({ type: 'SUBMIT_WORD', playerId: 'local', at: clock.now() });
      setTimeout(() => {
        setSubmitFeedback(null);
        prevFormedRef.current = '';
      }, 500);
    }
  }, [formedWord, targetWord, onDispatch, clock]);

  const prevScoreRef = useRef(displayScore);
  useEffect(() => {
    if (onScoreChange && displayScore !== prevScoreRef.current) {
      onScoreChange(displayScore);
      prevScoreRef.current = displayScore;
    }
  }, [displayScore, onScoreChange]);

  // When the opponent shuffles OUR board, play the spin animation.
  const prevShuffleSignalRef = useRef(shuffleSignal);
  useEffect(() => {
    if (shuffleSignal !== prevShuffleSignalRef.current) {
      prevShuffleSignalRef.current = shuffleSignal;
      setIsShuffling(true);
      const id = setTimeout(() => setIsShuffling(false), 1000);
      return () => clearTimeout(id);
    }
  }, [shuffleSignal]);

  const hintTimerKey = `${targetWord}-${wordStartedAt}-${selectedIds.length}`;

  useEffect(() => {
    setHintCellId(null);
    if (!targetWord || !player || selectedIds.length >= targetWord.length) return;

    const timeoutId = window.setTimeout(() => {
      const id = findHintCellId(player.columns, targetWord, selectedIds);
      setHintCellId(id);
    }, LETTER_HINT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [hintTimerKey, targetWord, player, selectedIds]);

  useEffect(() => {
    if (!isSoloVictory) {
      setVictorySnapshot(null);
      return;
    }

    setVictorySnapshot(prev => {
      if (!prev) {
        return buildVictorySnapshot(
          displayScore,
          bestScore,
          forceRecordRef.current,
          forceEpicRef.current,
          devPreviewRef.current,
          leaderboardEntries,
        );
      }
      if (!prev.forceRecord && bestScore > prev.previousBest) {
        return { ...prev, previousBest: bestScore };
      }
      return prev;
    });
  }, [isSoloVictory, displayScore, bestScore]);

  useEffect(() => {
    if (!isSoloVictory) {
      setCelebrationPhase('idle');
      setCelebrationGrid(null);
      setShowVictoryPopup(false);
      setConfettiPieces([]);
      setFireworkBursts([]);
      setCelebrationEpic(false);
      forceEpicRef.current = false;
      forceRecordRef.current = false;
      devPreviewRef.current = false;
      setVictoryActionsEnabled(false);
      return;
    }

    victoryRunRef.current += 1;
    const runId = victoryRunRef.current;
    const seed = gameState.seed;
    const language = gameState.language ?? 'tr';

    setCelebrationPhase('wait');
    setCelebrationGrid(null);
    setShowVictoryPopup(false);
    setConfettiPieces([]);
    setFireworkBursts([]);
    setVictoryActionsEnabled(false);

    let popupTimerId: number | undefined;

    const waitId = window.setTimeout(() => {
      if (victoryRunRef.current !== runId) return;

      setVictorySnapshot(snap => {
        const resolved =
          snap ??
          buildVictorySnapshot(
            displayScore,
            bestScore,
            forceRecordRef.current,
            forceEpicRef.current,
            devPreviewRef.current,
            leaderboardEntries,
          );
        const epic = isEpicVictoryCelebration(
          resolved.score,
          resolved.previousBest,
          leaderboardEntries,
          resolved.forceEpic || resolved.forceRecord,
        );
        setCelebrationEpic(epic);
        setConfettiPieces(buildConfettiPieces(seed, epic ? 80 : 36));
        if (epic) {
          setFireworkBursts(buildFireworkBursts(seed, 18));
        }
        return resolved;
      });

      setCelebrationGrid(buildVictoryAlphabetGrid(language));
      setCelebrationPhase('celebrate');

      popupTimerId = window.setTimeout(() => {
        if (victoryRunRef.current !== runId) return;
        setShowVictoryPopup(true);
      }, CELEBRATION_POPUP_DELAY_MS);
    }, SOLO_VICTORY_WAIT_MS);

    return () => {
      window.clearTimeout(waitId);
      if (popupTimerId !== undefined) window.clearTimeout(popupTimerId);
    };
  }, [isSoloVictory, gameState.seed, gameState.language]);

  useEffect(() => {
    if (!showVictoryPopup) {
      setVictoryActionsEnabled(false);
      return;
    }

    const timer = window.setTimeout(
      () => setVictoryActionsEnabled(true),
      VICTORY_POPUP_ACTION_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [showVictoryPopup]);

  function handleVictoryAction(action: 'playAgain' | 'menu') {
    if (!victoryActionsEnabled || !onSoloVictoryDone) return;
    onSoloVictoryDone(action);
  }

  useEffect(() => {
    if (!import.meta.env.DEV || isMultiplayer || isSoloVictory) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      if (e.key === 'v' || e.code === 'KeyV') {
        e.preventDefault();
        forceEpicRef.current = false;
        forceRecordRef.current = false;
        devPreviewRef.current = true;
        onDispatch({ type: 'TRIGGER_SOLO_VICTORY', playerId: 'local', at: clock.now() });
        return;
      }

      if (e.key === 'r' || e.code === 'KeyR') {
        e.preventDefault();
        forceEpicRef.current = false;
        forceRecordRef.current = true;
        devPreviewRef.current = true;
        onDispatch({ type: 'TRIGGER_SOLO_VICTORY', playerId: 'local', at: clock.now() });
        return;
      }

      if (e.key === 'e' || e.code === 'KeyE') {
        e.preventDefault();
        forceEpicRef.current = true;
        forceRecordRef.current = false;
        devPreviewRef.current = true;
        onDispatch({ type: 'TRIGGER_SOLO_VICTORY', playerId: 'local', at: clock.now() });
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMultiplayer, isSoloVictory, onDispatch, clock]);

  const isLeading = isMultiplayer && displayScore > opponentScore;
  const isBehind = isMultiplayer && displayScore < opponentScore;

  const triggerInvalidTap = useCallback((id: string) => {
    setSubmitFeedback('invalid');
    setErrorTileId(id);
    navigator.vibrate?.(80);
    window.setTimeout(() => {
      setSubmitFeedback(null);
      setErrorTileId(null);
    }, 400);
  }, []);

  const handleTapTile = useCallback(
    (id: string, e: React.PointerEvent) => {
      e.preventDefault();
      if (!player) return;

      if (selectedIds.includes(id)) {
        triggerInvalidTap(id);
        return;
      }

      const cell = getCellById(player.columns, id);
      if (!cell) return;

      if (!isCorrectNextLetter(targetWord, selectedIds.length, cell.letter)) {
        triggerInvalidTap(id);
        return;
      }

      onDispatch({ type: 'SELECT_LETTER', playerId: 'local', letterId: id });
    },
    [onDispatch, player, selectedIds, targetWord, triggerInvalidTap],
  );

  function handleSkip() {
    onDispatch({ type: 'SKIP_WORD', playerId: 'local', at: clock.now() });
  }

  function handleShuffle() {
    if (!isMultiplayer || player?.shuffleUsed) return;
    onShuffle?.();
  }

  function handleDoubleBonus() {
    if (!player || player.doubleBonusUsed || player.doubleBonusActive || !targetWord) {
      return;
    }
    onDispatch({ type: 'ACTIVATE_DOUBLE', playerId: 'local', at: clock.now() });
  }

  // Pre-compute which columns the clock doesn't need — just render grid cells
  // columns[col][rowIndex], rowIndex 0 = bottom → visual row = GRID_ROWS - 1 - rowIndex
  const cellsByPosition = new Map<string, { id: string; letter: string }>();
  if (player) {
    for (let col = 0; col < GRID_COLS; col++) {
      const column = player.columns[col] ?? [];
      for (let rowFromBottom = 0; rowFromBottom < column.length; rowFromBottom++) {
        const cell = column[rowFromBottom];
        if (cell) {
          cellsByPosition.set(`${col}-${rowFromBottom}`, cell);
        }
      }
    }
  }

  return (
    <div
      className={`screen game-screen${isMultiplayer ? ' game-screen--vs' : ''}${isSoloVictory ? ' game-screen--solo-victory' : ''}${isCelebrating ? ' game-screen--celebrating' : ''}${celebrationEpic ? ' game-screen--celebrating-epic' : ''}`}
      style={{ '--celebration-pop-ms': `${CELEBRATION_TILE_POP_MS}ms` } as React.CSSProperties}
    >
      {showResignConfirm && onQuit && (
        <div className="confirm-overlay" onClick={() => setShowResignConfirm(false)}>
          <div
            className="confirm-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resign-confirm-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="resign-confirm-title" className="confirm-title">
              {t.resignConfirmTitle}
            </h2>
            <p className="confirm-message">{t.resignConfirmMessage}</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-btn confirm-btn--danger"
                onClick={() => {
                  setShowResignConfirm(false);
                  onQuit();
                }}
              >
                {t.resignConfirmYes}
              </button>
              <button
                type="button"
                className="confirm-btn confirm-btn--secondary"
                onClick={() => setShowResignConfirm(false)}
              >
                {t.resignConfirmNo}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      {isMultiplayer ? (
        <div className="vs-hud">
          <div
            className={`vs-card vs-card--you${isLeading ? ' vs-card--leading' : ''}${isBehind ? ' vs-card--behind' : ''}`}
          >
            <span className="vs-card-label">{t.you}</span>
            <span key={displayScore} className="vs-card-score">
              {displayScore}
            </span>
            {isLeading && <span className="vs-lead-badge">{t.winning}</span>}
          </div>
          <div className="vs-center">
            <span className={`vs-time${isUrgent ? ' vs-time--urgent' : ''}`}>
              {formatTime(timeLeft)}
            </span>
            <span className="vs-versus">{t.vs}</span>
          </div>
          <div
            className={`vs-card vs-card--opp${!isLeading && !isBehind ? '' : isLeading ? ' vs-card--behind' : ' vs-card--leading'}`}
          >
            <span className="vs-card-label">{t.them}</span>
            <span key={opponentScore} className="vs-card-score vs-card-score--opp">
              {opponentScore}
            </span>
            {isBehind && <span className="vs-lead-badge vs-lead-badge--danger">{t.winning}</span>}
          </div>
        </div>
      ) : (
        <div className="hud">
          <div className="hud-item">
            <span className="hud-label">{t.score}</span>
            <span key={displayScore} className="hud-value hud-score">
              {displayScore}
            </span>
          </div>
          <div className="hud-item">
            <span className="hud-label">{t.elapsed}</span>
            <span className="hud-value">
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>
      )}

      {/* Target word banner */}
      {!showVictoryPopup && (
      <div
        className={`target-word-banner notranslate${submitFeedback === 'valid' ? ' target-word-banner--valid' : ''}${submitFeedback === 'invalid' ? ' target-word-banner--invalid' : ''}${wordMatchesTarget ? ' target-word-banner--complete' : ''}${isSoloVictory ? ' target-word-banner--victory' : ''}`}
        lang={language}
        translate="no"
      >
        {isSoloVictory && !showVictoryPopup ? (
          <span className="target-word-victory-badge target-word-victory-badge--compact">
            {t.soloComplete}
          </span>
        ) : isSoloVictory ? null : targetWord ? (
          <>
            <span className="target-word-label">{t.find}</span>
            <span className="target-word-text">
              {Array.from(targetWord).map((ch, i) => {
                const progressIndex = selectedIds.length;
                let letterState = 'pending';
                if (i < progressIndex) letterState = 'done';
                else if (i === progressIndex) letterState = 'current';

                return (
                  <span
                    key={i}
                    className={`target-word-letter target-word-letter--${letterState}`}
                  >
                    <span className="letter-glyph" translate="no">
                      {upperByLanguage(ch, language)}
                    </span>
                  </span>
                );
              })}
            </span>
            {wordMatchesTarget && formedWord.length > 0 && (
              <span className="target-word-score">+{wordScore}</span>
            )}
          </>
        ) : (
          <span className="target-word-label" style={{ opacity: 0.5 }}>
            {language === 'tr' ? 'DAHA FAZLA KELİME YOK' : 'NO MORE WORDS'}
          </span>
        )}
      </div>
      )}

      {/* Grid arena container with timer */}
      <div className="arena-container">
        {/* Vertical word timer bar */}
        {targetWord && wordDuration > 0 && !isSoloVictory && (
          <div className="word-timer-bar word-timer-bar--vertical">
            <div className="word-timer-bar__fill-track">
              <div
                key={wordTimerKey}
                className="word-timer-bar__fill"
                style={
                  {
                    '--word-duration': `${wordDuration}ms`,
                    '--word-start-elapsed': `${initialWordElapsed}ms`,
                  } as React.CSSProperties
                }
              />
            </div>
            <div className="word-timer-bar__text">
              {Math.ceil(wordTimeLeft / 1000)}s
            </div>
          </div>
        )}
        
        {/* Grid arena */}
        <div
          className={`arena grid-arena notranslate${isShuffling ? ' grid-arena--shuffling' : ''}${isCelebrating ? ' grid-arena--celebration' : ''}${celebrationEpic ? ' grid-arena--celebration-epic' : ''}`}
          lang={language}
          translate="no"
          style={{ '--grid-cols': GRID_COLS, '--grid-rows': GRID_ROWS } as React.CSSProperties}
        >
        {/* Empty cell backgrounds */}
        {Array.from({ length: GRID_COLS }, (_, col) =>
          Array.from({ length: GRID_ROWS }, (_, rowFromTop) => (
            <div
              key={`empty-${col}-${rowFromTop}`}
              className="grid-cell-bg"
              style={{
                left: `${col * COL_PCT}%`,
                top: `${rowFromTop * ROW_PCT}%`,
                width: `${COL_PCT}%`,
                height: `${ROW_PCT}%`,
              }}
            />
          )),
        )}

        {/* Filled cells */}
        {isCelebrating && celebrationGrid
          ? celebrationGrid.columns.map((col, colIdx) =>
              col.map((cell, rowFromBottom) => {
                const rowFromTop = GRID_ROWS - 1 - rowFromBottom;
                const delay = celebrationTileDelay(colIdx, rowFromTop);
                return (
                  <div
                    key={cell.id}
                    className="grid-tile grid-tile--celebration"
                    style={{
                      left: `${colIdx * COL_PCT}%`,
                      top: `${rowFromTop * ROW_PCT}%`,
                      width: `${COL_PCT}%`,
                      height: `${ROW_PCT}%`,
                      background: tileColor(cell.letter),
                      '--celebration-delay': `${delay}ms`,
                    } as React.CSSProperties}
                  >
                    <LetterGlyph letter={cell.letter} language={language} />
                  </div>
                );
              }),
            )
          : player?.columns.map((col, colIdx) =>
          col.map((cell, rowFromBottom) => {
            const rowFromTop = GRID_ROWS - 1 - rowFromBottom;
            const isSelected = selectedSet.has(cell.id);
            const selOrder = selectedIds.indexOf(cell.id);
            return (
              <button
                key={cell.id}
                className={`grid-tile grid-tile--landed${isSelected ? ' grid-tile--selected' : ''}${errorTileId === cell.id ? ' grid-tile--error' : ''}${hintCellId === cell.id ? ' grid-tile--hint' : ''}`}
                style={{
                  left: `${colIdx * COL_PCT}%`,
                  top: `${rowFromTop * ROW_PCT}%`,
                  width: `${COL_PCT}%`,
                  height: `${ROW_PCT}%`,
                  background: tileColor(cell.letter),
                }}
                onPointerDown={e => handleTapTile(cell.id, e)}
                {...TILE_BUTTON_ATTRS}
              >
                <LetterGlyph letter={cell.letter} language={language} />
                {hintCellId === cell.id && (
                  <span className="grid-tile__hint-badge">{t.hintBadge}</span>
                )}
                {isSelected && selOrder >= 0 && (
                  <span className="grid-tile__order">{selOrder + 1}</span>
                )}
              </button>
            );
          }),
        )}
      </div>
      </div>

      {/* Action bar */}
      {!isSoloVictory && (
      <div className="word-panel">
        <div className="word-panel-actions">
          {onQuit && (
            <button
              type="button"
              className="resign-btn"
              onClick={() => setShowResignConfirm(true)}
            >
              {t.resign}
            </button>
          )}
          <button
            className="skip-btn"
            onPointerDown={e => {
              e.preventDefault();
              if (targetWord) handleSkip();
            }}
            disabled={!targetWord}
            title={`Skip word (-${SKIP_PENALTY} points)`}
          >
            {t.skip}
          </button>
          <button
            className={`double-btn${player?.doubleBonusActive ? ' double-btn--active' : ''}`}
            onPointerDown={e => {
              e.preventDefault();
              handleDoubleBonus();
            }}
            disabled={!targetWord || player?.doubleBonusUsed || player?.doubleBonusActive}
            title={
              player?.doubleBonusUsed
                ? t.doubleBonusUsed
                : player?.doubleBonusActive
                  ? t.doubleBonusActive
                  : t.doubleBonus
            }
          >
            {player?.doubleBonusActive
              ? formatDoubleBonusMultiplierLabel(player.doubleBonusStreak)
              : '2×'}
          </button>
          {isMultiplayer && (
            <button
              className="shuffle-btn"
              onPointerDown={e => {
                e.preventDefault();
                handleShuffle();
              }}
              disabled={player?.shuffleUsed}
              title={player?.shuffleUsed ? (language === 'tr' ? 'Kullanıldı' : 'Used') : (language === 'tr' ? 'Rakibin tahtasını karıştır!' : 'Shuffle opponent board!')}
            >
              🎲
            </button>
          )}
        </div>
      </div>
      )}

      {celebrationEpic && fireworkBursts.length > 0 && (isCelebrating || showVictoryPopup) && (
        <VictoryFireworks bursts={fireworkBursts} />
      )}

      {showVictoryPopup && (
        <div
          className={`victory-overlay${celebrationEpic ? ' victory-overlay--epic' : ''}`}
          role="presentation"
        >
          <div className="victory-confetti" aria-hidden="true">
            {confettiPieces.map(piece => (
              <span
                key={piece.id}
                className="victory-confetti__piece"
                style={{
                  left: `${piece.left}%`,
                  width: `${piece.size}px`,
                  height: `${piece.size * 0.55}px`,
                  background: piece.color,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                  '--confetti-drift': `${piece.drift}px`,
                  '--confetti-rotate': `${piece.rotate}deg`,
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div
            className={`victory-popup${celebrationEpic ? ' victory-popup--epic' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="victory-popup-title"
          >
            <h2 id="victory-popup-title" className="victory-popup__title">
              {t.soloComplete}
            </h2>
            {epicBadgeLabel && <div className="victory-epic-badge">{epicBadgeLabel}</div>}
            {!celebrationEpic && isNewBest && <div className="new-best-badge">{t.newBest}</div>}
            <div className="victory-popup__score">{snapshotScore}</div>
            <div className="victory-popup__score-label">
              {snapshotScore === 1 ? t.point : t.points}
            </div>
            {victoryHonorMessage && (
              <p
                className={`victory-popup__honor${
                  honorFocus === 'record' || (honorFocus === 'both' && isNewBest)
                    ? ' victory-popup__honor--record'
                    : ''
                }`}
              >
                {victoryHonorMessage}
              </p>
            )}
            {!isNewBest && snapshotPreviousBest > 0 && (
              <div className="best-score-chip">
                <span className="best-score-chip__label">{t.yourBest}</span>
                <span className="best-score-chip__value">{snapshotPreviousBest}</span>
              </div>
            )}
            <div className={`victory-popup__actions${victoryActionsEnabled ? '' : ' victory-popup__actions--locked'}`}>
              <button
                type="button"
                className="play-btn"
                disabled={!victoryActionsEnabled}
                onPointerDown={e => e.preventDefault()}
                onClick={() => handleVictoryAction('playAgain')}
              >
                {t.playAgain}
              </button>
              {onSoloVictoryDone && (
                <button
                  type="button"
                  className="play-btn play-btn--secondary"
                  disabled={!victoryActionsEnabled}
                  onPointerDown={e => e.preventDefault()}
                  onClick={() => handleVictoryAction('menu')}
                >
                  {t.menu}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
