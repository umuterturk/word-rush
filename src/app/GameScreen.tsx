import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameAction, GameState, LandedCell } from '../domain/types';
import { SKIP_PENALTY, LETTER_HINT_DELAY_MS } from '../domain/constants';
import type { ClockPort, LeaderboardEntry } from '../ports';
import { useI18n } from '../i18n';
import { getPlayerWordDuration, formatDoubleBonusMultiplierLabel, findHintCellId, getCellById, isCorrectNextLetter, computeWordPoints, buildVictoryAlphabetGrid } from '../domain/gridUtils';
import { createSeededRng } from '../domain/seededRng';
import { upperByLanguage } from '../domain/turkishText';
import {
  badgeIdFromBonus,
  EMPTY_BADGE_COUNTS,
  resolveFastBadgeTier,
  totalBadgeCount,
  type BadgeCounts,
  type BadgeId,
} from '../domain/badges';
import { streakCalloutLabel } from './badgeLabels';
import { BadgeReveal } from './BadgeReveal';
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
  gameClockNow: number;
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
  username?: string;
  onVictoryUsernameSave?: (name: string, score: number) => void;
  onSoloVictoryDone?: (action: 'playAgain' | 'menu') => void;
  onBadgesEarned?: (ids: BadgeId[]) => void;
  badgeCounts?: BadgeCounts;
  sessionBadges?: BadgeCounts;
  lifetimeBadgeBefore?: BadgeCounts;
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

const CONFETTI_COLORS = ['#ffd54f', '#81c784', '#ce93d8', '#4fc3f7', '#ff8a65', '#fff176'];

const WORD_COMPLETE_FX_MS = 2000;
const SCORE_COUNT_MS = 500;
const HUD_FX_HIDE_DELAY_MS = 1400;
const TAP_OK_MS = 150;

interface BonusCallout {
  kind: 'fast' | 'streak' | 'double';
  tier: number;
  label: string;
}

interface BonusLabels {
  fastBonus1: string;
  fastBonus2: string;
  doubleBonusActive: string;
}

interface WordCompleteFx {
  runId: number;
  scoreBefore: number;
  total: number;
  streak: number;
  bonusCallouts: BonusCallout[];
  hasBurst: boolean;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  letter: string;
  color: string;
  bigBurst: boolean;
}

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

function celebrationTileDelay(
  col: number,
  rowFromTop: number,
  gridCols: number,
  gridRows: number,
): number {
  const centerCol = (gridCols - 1) / 2;
  const centerRow = (gridRows - 1) / 2;
  return Math.round(Math.hypot(col - centerCol, rowFromTop - centerRow) * CELEBRATION_STAGGER_MS);
}

function getTilePositionPct(
  columns: LandedCell[][],
  tileId: string,
  gridRows: number,
  gridCols: number,
): { leftPct: number; topPct: number; widthPct: number; heightPct: number } | null {
  const colPct = gridCols > 0 ? 100 / gridCols : 0;
  const rowPct = gridRows > 0 ? 100 / gridRows : 0;
  for (let col = 0; col < columns.length; col++) {
    const column = columns[col] ?? [];
    for (let rowFromBottom = 0; rowFromBottom < column.length; rowFromBottom++) {
      const cell = column[rowFromBottom];
      if (cell?.id === tileId) {
        const rowFromTop = gridRows - 1 - rowFromBottom;
        return {
          leftPct: col * colPct,
          topPct: rowFromTop * rowPct,
          widthPct: colPct,
          heightPct: rowPct,
        };
      }
    }
  }
  return null;
}

function getWordStreakTier(streak: number): 0 | 1 | 2 | 3 | 4 {
  if (streak >= 10) return 4;
  if (streak >= 7) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}

function resolveFastCallout(
  elapsedMs: number,
  wordLength: number,
  labels: BonusLabels,
): BonusCallout | null {
  const tier = resolveFastBadgeTier(elapsedMs, wordLength);
  if (!tier) return null;
  return { kind: 'fast', tier, label: tier === 1 ? labels.fastBonus1 : labels.fastBonus2 };
}

function resolveStreakCallout(
  streak: number,
  labelFor: (streak: number) => string,
): BonusCallout | null {
  if (streak < 2 || streak > 7) return null;
  return { kind: 'streak', tier: streak, label: labelFor(streak) };
}

function buildBonusCallouts(
  elapsedMs: number,
  wordLength: number,
  doubleBonusActive: boolean,
  streak: number,
  labels: BonusLabels,
  streakLabel: (streak: number) => string,
): BonusCallout[] {
  const callouts: BonusCallout[] = [];
  const fast = resolveFastCallout(elapsedMs, wordLength, labels);
  if (fast) callouts.push(fast);
  const streakCallout = resolveStreakCallout(streak, streakLabel);
  if (streakCallout) callouts.push(streakCallout);
  if (doubleBonusActive) {
    callouts.push({ kind: 'double', tier: 1, label: labels.doubleBonusActive });
  }
  return callouts;
}

function HudFloatingBadges({
  fx,
  hidden,
  badgeCounts,
  streakLabel,
  streakAria,
}: {
  fx: WordCompleteFx;
  hidden: boolean;
  badgeCounts: BadgeCounts;
  streakLabel: string;
  streakAria: string;
}) {
  const hasContent = fx.total > 0 || fx.streak > 0 || fx.bonusCallouts.length > 0;
  if (!hasContent) return null;

  return (
    <div
      className={`hud-floating-badges${hidden ? ' hud-floating-badges--hidden' : ''}`}
      aria-live="polite"
    >
      {fx.total > 0 && (
        <span className="hud-floating-badges__score">+{fx.total}</span>
      )}
      {fx.streak > 0 && (
        <WordStreakBadge
          streak={fx.streak}
          label={streakLabel}
          bump={!hidden}
          ariaLabel={streakAria}
          className="word-streak-badge--float"
        />
      )}
      {fx.bonusCallouts.map((bonus, index) => {
        const badgeId = badgeIdFromBonus(bonus.kind, bonus.tier);
        const count = badgeCounts[badgeId] ?? 0;
        return (
          <span
            key={`${bonus.kind}-${bonus.tier}-${index}`}
            className={`hud-bonus-callout hud-bonus-callout--${bonus.kind} hud-bonus-callout--tier-${bonus.tier}`}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <span className="hud-bonus-callout__label">{bonus.label}</span>
            {count > 0 && <span className="hud-bonus-callout__count">{count}</span>}
          </span>
        );
      })}
    </div>
  );
}

function WordStreakBadge({
  streak,
  label,
  bump = false,
  className = '',
  ariaLabel,
}: {
  streak: number;
  label: string;
  bump?: boolean;
  className?: string;
  ariaLabel: string;
}) {
  if (streak <= 0) return null;
  const tier = getWordStreakTier(streak);
  return (
    <span
      key={streak}
      className={`word-streak-badge word-streak-badge--tier-${tier}${bump ? ' word-streak-badge--bump' : ''}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
    >
      {label}
    </span>
  );
}

function WordCompleteBurst({ fx, language }: { fx: WordCompleteFx; language: 'tr' | 'en' }) {
  const particleCount = fx.bigBurst ? 8 : 4;
  const ringScale = fx.bigBurst ? 2.8 : 2.0;
  return (
    <div
      className={`word-complete-burst${fx.bigBurst ? ' word-complete-burst--big' : ''}`}
      style={{
        left: `${fx.leftPct + fx.widthPct / 2}%`,
        top: `${fx.topPct + fx.heightPct / 2}%`,
        '--burst-size': `${fx.widthPct}%`,
        '--ring-scale': ringScale,
      } as React.CSSProperties}
      aria-hidden="true"
    >
      <span
        className="word-complete-burst__bubble"
        style={{ background: fx.color }}
      >
        <LetterGlyph letter={fx.letter} language={language} />
      </span>
      <span className="word-complete-burst__ring" style={{ borderColor: fx.color }} />
      {Array.from({ length: particleCount }, (_, i) => (
        <span
          key={i}
          className="word-complete-burst__particle"
          style={{
            '--angle': `${(360 / particleCount) * i}deg`,
            background: fx.color,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function GameScreen({
  gameState,
  logicalTime,
  gameClockNow,
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
  username = '',
  onVictoryUsernameSave,
  onSoloVictoryDone,
  onBadgesEarned,
  badgeCounts = EMPTY_BADGE_COUNTS,
  sessionBadges = EMPTY_BADGE_COUNTS,
  lifetimeBadgeBefore = EMPTY_BADGE_COUNTS,
}: Props) {
  const { t, language } = useI18n();
  // Board content (tile letters, target word) must follow the MATCH's language,
  // not the viewer's UI language — otherwise a Turkish match shown to an
  // English-set opponent mis-cases Turkish letters (e.g. 'i' → 'I' instead of
  // 'İ'). UI chrome (labels, tooltips) still uses the UI `language`.
  const gameLanguage = gameState.language ?? language;
  const player = gameState.players['local'];
  const gridCols = gameState.gridCols;
  const gridRows = gameState.gridRows;
  const colPct = gridCols > 0 ? 100 / gridCols : 0;
  const rowPct = gridRows > 0 ? 100 / gridRows : 0;
  const matchGrid = { cols: gridCols, rows: gridRows };
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
    ? getPlayerWordDuration(player, gameState.matchMode, 'gameplay', matchGrid)
    : 0;
  const currentTime = gameClockNow;
  const wordElapsed = wordStartedAt > 0 ? Math.max(0, currentTime - wordStartedAt) : 0;
  const wordTimeLeft = Math.max(0, wordDuration - wordElapsed);
  const wordTimerKey = `${targetWord}-${wordStartedAt}`;
  const isWordTimerUrgent =
    wordDuration > 0 && (wordTimeLeft / wordDuration < 0.25 || wordTimeLeft <= 3000);
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

  const [submitFeedback, setSubmitFeedback] = useState<'valid' | 'invalid' | null>(null);
  const [wordCompleteFx, setWordCompleteFx] = useState<WordCompleteFx | null>(null);
  const [hudScoreDisplay, setHudScoreDisplay] = useState<number | null>(null);
  const [hudFxHidden, setHudFxHidden] = useState(false);
  const wordCompleteFxRunRef = useRef(0);
  const [errorTileId, setErrorTileId] = useState<string | null>(null);
  const [tapOkTileId, setTapOkTileId] = useState<string | null>(null);
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
  const [victoryNameDraft, setVictoryNameDraft] = useState('');
  const victoryNameInputRef = useRef<HTMLInputElement>(null);
  const prevDoubleBonusActiveRef = useRef(false);
  const prevDoubleBonusStreakRef = useRef(0);
  const [doubleChipFlash, setDoubleChipFlash] = useState(false);
  const [streakChipPop, setStreakChipPop] = useState(false);

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
  const needsNamePrompt =
    isSoloVictory &&
    !username.trim() &&
    snapshotScore > 0 &&
    (isNewBest || qualifiesForLeaderboard);
  const hasVictoryBadges = totalBadgeCount(sessionBadges) > 0;
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
      formedWord !== prevFormedRef.current &&
      player &&
      targetWord
    ) {
      prevFormedRef.current = formedWord;
      const lastTileId = selectedIds[selectedIds.length - 1];
      const submittedAt = clock.now();
      const breakdown = computeWordPoints({
        word: targetWord,
        columns: player.columns,
        submittedAt,
        wordStartedAt: player.wordStartedAt,
        matchMode: gameState.matchMode,
        player,
        soloDifficulty: gameState.soloDifficulty,
        grid: matchGrid,
      });
      const elapsedMs = Math.max(0, submittedAt - player.wordStartedAt);
      const nextStreak = (player.wordStreak ?? 0) + 1;
      const pos = lastTileId
        ? getTilePositionPct(player.columns, lastTileId, gridRows, gridCols)
        : null;
      const lastCell = lastTileId ? getCellById(player.columns, lastTileId) : null;
      const scoreBefore = player.score;
      wordCompleteFxRunRef.current += 1;
      const bonusCallouts = buildBonusCallouts(
        elapsedMs,
        targetWord.length,
        player.doubleBonusActive,
        nextStreak,
        {
          fastBonus1: t.fastBonus1,
          fastBonus2: t.fastBonus2,
          doubleBonusActive: t.doubleBonusActive,
        },
        n => streakCalloutLabel(t, n),
      );
      onBadgesEarned?.(
        bonusCallouts.map(callout => badgeIdFromBonus(callout.kind, callout.tier)),
      );
      const fxBase = {
        runId: wordCompleteFxRunRef.current,
        scoreBefore,
        total: breakdown.total,
        streak: nextStreak,
        bonusCallouts,
      };
      if (pos && lastCell) {
        setWordCompleteFx({
          ...fxBase,
          hasBurst: true,
          leftPct: pos.leftPct,
          topPct: pos.topPct,
          widthPct: pos.widthPct,
          heightPct: pos.heightPct,
          letter: lastCell.letter,
          color: tileColor(lastCell.letter),
          bigBurst: breakdown.total >= 7,
        });
      } else {
        setWordCompleteFx({
          ...fxBase,
          hasBurst: false,
          leftPct: 0,
          topPct: 0,
          widthPct: 0,
          heightPct: 0,
          letter: '',
          color: '',
          bigBurst: false,
        });
      }
      setSubmitFeedback('valid');
      if (nextStreak >= 7) {
        navigator.vibrate?.([15, 40, 15, 40, 50]);
      } else if (nextStreak >= 4) {
        navigator.vibrate?.([20, 40, 60]);
      } else {
        navigator.vibrate?.([20, 30, 50]);
      }
      onDispatch({ type: 'SUBMIT_WORD', playerId: 'local', at: submittedAt });
      const timerId = window.setTimeout(() => {
        setSubmitFeedback(null);
        setWordCompleteFx(null);
        setHudScoreDisplay(null);
        setHudFxHidden(false);
        prevFormedRef.current = '';
      }, WORD_COMPLETE_FX_MS);
      return () => window.clearTimeout(timerId);
    }
  }, [
    formedWord,
    targetWord,
    onDispatch,
    clock,
    player,
    selectedIds,
    gameState.matchMode,
    gameState.soloDifficulty,
    matchGrid,
    gridRows,
    gridCols,
    t.fastBonus1,
    t.fastBonus2,
    t.doubleBonusActive,
    onBadgesEarned,
  ]);

  useEffect(() => {
    if (!wordCompleteFx || submitFeedback !== 'valid') {
      setHudScoreDisplay(null);
      return;
    }

    const from = wordCompleteFx.scoreBefore;
    const to = from + wordCompleteFx.total;
    if (to <= from) {
      setHudScoreDisplay(to);
      return;
    }

    const steps = to - from;
    const stepMs = SCORE_COUNT_MS / steps;
    let current = from;
    setHudScoreDisplay(from);

    const intervalId = window.setInterval(() => {
      current += 1;
      setHudScoreDisplay(current);
      if (current >= to) {
        window.clearInterval(intervalId);
      }
    }, stepMs);

    return () => window.clearInterval(intervalId);
  }, [wordCompleteFx?.runId, wordCompleteFx?.scoreBefore, wordCompleteFx?.total, submitFeedback]);

  useEffect(() => {
    if (!wordCompleteFx) {
      setHudFxHidden(false);
      return;
    }

    setHudFxHidden(false);
    const timerId = window.setTimeout(() => setHudFxHidden(true), HUD_FX_HIDE_DELAY_MS);
    return () => window.clearTimeout(timerId);
  }, [wordCompleteFx?.runId, wordCompleteFx]);

  const prevScoreRef = useRef(displayScore);
  useEffect(() => {
    if (onScoreChange && displayScore !== prevScoreRef.current) {
      onScoreChange(displayScore);
      prevScoreRef.current = displayScore;
    }
  }, [displayScore, onScoreChange]);

  useEffect(() => {
    const active = player?.doubleBonusActive ?? false;
    if (active && !prevDoubleBonusActiveRef.current) {
      setDoubleChipFlash(true);
      const id = window.setTimeout(() => setDoubleChipFlash(false), 600);
      prevDoubleBonusActiveRef.current = active;
      return () => window.clearTimeout(id);
    }
    prevDoubleBonusActiveRef.current = active;
  }, [player?.doubleBonusActive]);

  useEffect(() => {
    const streak = player?.doubleBonusStreak ?? 0;
    if (streak > prevDoubleBonusStreakRef.current && (player?.doubleBonusActive ?? false)) {
      setStreakChipPop(true);
      const id = window.setTimeout(() => setStreakChipPop(false), 400);
      prevDoubleBonusStreakRef.current = streak;
      return () => window.clearTimeout(id);
    }
    prevDoubleBonusStreakRef.current = streak;
  }, [player?.doubleBonusStreak, player?.doubleBonusActive]);

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

      setCelebrationGrid(buildVictoryAlphabetGrid(language, matchGrid));
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
      setVictoryNameDraft('');
      return;
    }

    const timer = window.setTimeout(
      () => setVictoryActionsEnabled(true),
      VICTORY_POPUP_ACTION_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [showVictoryPopup]);

  useEffect(() => {
    if (!showVictoryPopup || !needsNamePrompt) return;
    victoryNameInputRef.current?.focus();
  }, [showVictoryPopup, needsNamePrompt]);

  function handleVictoryAction(action: 'playAgain' | 'menu') {
    if (!victoryActionsEnabled || !onSoloVictoryDone) return;
    const trimmedName = victoryNameDraft.trim();
    if (needsNamePrompt && trimmedName && onVictoryUsernameSave) {
      onVictoryUsernameSave(trimmedName, snapshotScore);
    }
    onSoloVictoryDone(action);
  }

  const grantDebugBadges = useCallback(
    (ids: BadgeId[], callouts: BonusCallout[]) => {
      if (!import.meta.env.DEV || ids.length === 0) return;
      onBadgesEarned?.(ids);
      wordCompleteFxRunRef.current += 1;
      setSubmitFeedback('valid');
      setHudFxHidden(false);
      setWordCompleteFx({
        runId: wordCompleteFxRunRef.current,
        scoreBefore: displayScore,
        total: 0,
        streak: player?.wordStreak ?? 0,
        bonusCallouts: callouts,
        hasBurst: false,
        leftPct: 0,
        topPct: 0,
        widthPct: 0,
        heightPct: 0,
        letter: '',
        color: '',
        bigBurst: false,
      });
      window.setTimeout(() => {
        setSubmitFeedback(null);
        setWordCompleteFx(null);
        setHudScoreDisplay(null);
        setHudFxHidden(false);
      }, WORD_COMPLETE_FX_MS);
    },
    [onBadgesEarned, displayScore, player?.wordStreak],
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      if (!e.shiftKey && (e.key === 'r' || e.code === 'KeyR')) {
        e.preventDefault();
        grantDebugBadges(
          ['streak_2', 'streak_7'],
          [
            { kind: 'streak', tier: 2, label: streakCalloutLabel(t, 2) },
            { kind: 'streak', tier: 7, label: streakCalloutLabel(t, 7) },
          ],
        );
        return;
      }

      if (!e.shiftKey && (e.key === 'e' || e.code === 'KeyE')) {
        e.preventDefault();
        grantDebugBadges(
          ['fast_1', 'fast_2'],
          [
            { kind: 'fast', tier: 1, label: t.fastBonus1 },
            { kind: 'fast', tier: 2, label: t.fastBonus2 },
          ],
        );
        return;
      }

      if (isMultiplayer || isSoloVictory) return;

      if (e.key === 'v' || e.code === 'KeyV') {
        e.preventDefault();
        forceEpicRef.current = false;
        forceRecordRef.current = false;
        devPreviewRef.current = true;
        onDispatch({ type: 'TRIGGER_SOLO_VICTORY', playerId: 'local', at: clock.now() });
        return;
      }

      if (e.shiftKey && (e.key === 'R' || e.code === 'KeyR')) {
        e.preventDefault();
        forceEpicRef.current = false;
        forceRecordRef.current = true;
        devPreviewRef.current = true;
        onDispatch({ type: 'TRIGGER_SOLO_VICTORY', playerId: 'local', at: clock.now() });
        return;
      }

      if (e.shiftKey && (e.key === 'E' || e.code === 'KeyE')) {
        e.preventDefault();
        forceEpicRef.current = true;
        forceRecordRef.current = false;
        devPreviewRef.current = true;
        onDispatch({ type: 'TRIGGER_SOLO_VICTORY', playerId: 'local', at: clock.now() });
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMultiplayer, isSoloVictory, onDispatch, clock, grantDebugBadges, t]);

  useEffect(() => {
    if (!import.meta.env.DEV || isSoloVictory) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key !== '1' && e.code !== 'Digit1') return;
      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      e.preventDefault();
      onDispatch({ type: 'DEV_INCREMENT_WORD_STREAK', playerId: 'local' });
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSoloVictory, onDispatch]);

  const isLeading = isMultiplayer && displayScore > opponentScore;
  const isBehind = isMultiplayer && displayScore < opponentScore;

  const doubleStreakLabel =
    player?.doubleBonusActive && (player.doubleBonusStreak ?? 0) > 0
      ? `2× ×${player.doubleBonusStreak}`
      : '2×';

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
      setTapOkTileId(id);
      window.setTimeout(() => setTapOkTileId(current => (current === id ? null : current)), TAP_OK_MS);
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

  const isScoreCounting = hudScoreDisplay !== null;
  const shownScore = isScoreCounting ? hudScoreDisplay : displayScore;
  const activeWordCompleteFx =
    wordCompleteFx && submitFeedback === 'valid' ? wordCompleteFx : null;
  const hudFloatingBadges = activeWordCompleteFx ? (
    <HudFloatingBadges
      fx={activeWordCompleteFx}
      hidden={hudFxHidden}
      badgeCounts={badgeCounts}
      streakLabel={t.wordStreakPop.replace('{count}', String(activeWordCompleteFx.streak))}
      streakAria={t.wordStreakAria.replace('{count}', String(activeWordCompleteFx.streak))}
    />
  ) : null;

  // Pre-compute which columns the clock doesn't need — just render grid cells
  // columns[col][rowIndex], rowIndex 0 = bottom → visual row = gridRows - 1 - rowIndex
  const cellsByPosition = new Map<string, { id: string; letter: string }>();
  if (player) {
    for (let col = 0; col < gridCols; col++) {
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
        <div className="hud-bar">
          <div className="vs-hud">
            <div
              className={`vs-card vs-card--you${isLeading ? ' vs-card--leading' : ''}${isBehind ? ' vs-card--behind' : ''}`}
            >
              <span className="vs-card-label">{t.you}</span>
              <span className={`vs-card-score${isScoreCounting ? ' vs-card-score--counting' : ''}`}>
                {shownScore}
              </span>
              {player?.doubleBonusActive && (
                <span
                  className={`double-streak-chip${doubleChipFlash ? ' double-streak-chip--flash' : ''}${streakChipPop ? ' double-streak-chip--pop' : ''}`}
                >
                  {doubleStreakLabel}
                </span>
              )}
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
        </div>
      ) : (
        <div className="hud-bar">
          <div className="hud">
            <div className="hud-item">
              <span className="hud-label">{t.score}</span>
              <span
                className={`hud-value hud-score${isScoreCounting ? ' hud-score--counting' : ''}`}
              >
                {shownScore}
              </span>
              {player?.doubleBonusActive && (
                <span
                  className={`double-streak-chip double-streak-chip--solo${doubleChipFlash ? ' double-streak-chip--flash' : ''}${streakChipPop ? ' double-streak-chip--pop' : ''}`}
                >
                  {doubleStreakLabel}
                </span>
              )}
            </div>
            <div className="hud-item">
              <span className="hud-label">{t.elapsed}</span>
              <span className="hud-value">
                {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
        </div>
      )}

      {hudFloatingBadges}

      {/* Target word banner */}
      {!showVictoryPopup && (
      <>
      <div
        className={`target-word-banner notranslate${submitFeedback === 'valid' ? ' target-word-banner--valid' : ''}${submitFeedback === 'invalid' ? ' target-word-banner--invalid' : ''}${wordMatchesTarget ? ' target-word-banner--complete' : ''}${isSoloVictory ? ' target-word-banner--victory' : ''}`}
        lang={gameLanguage}
        translate="no"
      >
        {isSoloVictory && !showVictoryPopup ? (
          <span className="target-word-victory-badge target-word-victory-badge--compact">
            {t.soloComplete}
          </span>
        ) : isSoloVictory ? null : targetWord ? (
          <>
            <span className="target-word-text">
              {Array.from(targetWord).map((ch, i) => {
                const progressIndex = selectedIds.length;
                let letterState = 'pending';
                if (i < progressIndex) letterState = 'done';
                else if (i === progressIndex) letterState = 'current';

                return (
                  <span
                    key={i}
                    className={`target-word-letter target-word-letter--${letterState}${letterState === 'current' && isWordTimerUrgent ? ' target-word-letter--urgent' : ''}`}
                  >
                    <span className="letter-glyph" translate="no">
                      {upperByLanguage(ch, gameLanguage)}
                    </span>
                  </span>
                );
              })}
            </span>
          </>
        ) : (
          <span className="target-word-label" style={{ opacity: 0.5 }}>
            {language === 'tr' ? 'DAHA FAZLA KELİME YOK' : 'NO MORE WORDS'}
          </span>
        )}
      </div>
      </>
      )}

      {/* Grid arena container with timer */}
      <div className="arena-container">
        {/* Vertical word timer bar */}
        {targetWord && wordDuration > 0 && !isSoloVictory && (
          <div className={`word-timer-bar word-timer-bar--vertical${isWordTimerUrgent ? ' word-timer-bar--urgent' : ''}`}>
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
            <div className={`word-timer-bar__text${isWordTimerUrgent ? ' word-timer-bar__text--urgent' : ''}`}>
              {Math.ceil(wordTimeLeft / 1000)}s
            </div>
          </div>
        )}
        
        {/* Grid arena */}
        <div
          className={`arena grid-arena notranslate${isShuffling ? ' grid-arena--shuffling' : ''}${isCelebrating ? ' grid-arena--celebration' : ''}${celebrationEpic ? ' grid-arena--celebration-epic' : ''}`}
          lang={gameLanguage}
          translate="no"
          style={{
            '--grid-cols': gridCols,
            '--grid-rows': gridRows,
            aspectRatio: `${gridCols} / ${gridRows}`,
          } as React.CSSProperties}
        >
        {/* Empty cell backgrounds */}
        {Array.from({ length: gridCols }, (_, col) =>
          Array.from({ length: gridRows }, (_, rowFromTop) => (
            <div
              key={`empty-${col}-${rowFromTop}`}
              className="grid-cell-bg"
              style={{
                left: `${col * colPct}%`,
                top: `${rowFromTop * rowPct}%`,
                width: `${colPct}%`,
                height: `${rowPct}%`,
              }}
            />
          )),
        )}

        {/* Filled cells */}
        {isCelebrating && celebrationGrid
          ? celebrationGrid.columns.map((col, colIdx) =>
              col.map((cell, rowFromBottom) => {
                const rowFromTop = gridRows - 1 - rowFromBottom;
                const delay = celebrationTileDelay(colIdx, rowFromTop, gridCols, gridRows);
                return (
                  <div
                    key={cell.id}
                    className="grid-tile grid-tile--celebration"
                    style={{
                      left: `${colIdx * colPct}%`,
                      top: `${rowFromTop * rowPct}%`,
                      width: `${colPct}%`,
                      height: `${rowPct}%`,
                      background: tileColor(cell.letter),
                      '--celebration-delay': `${delay}ms`,
                    } as React.CSSProperties}
                  >
                    <LetterGlyph letter={cell.letter} language={gameLanguage} />
                  </div>
                );
              }),
            )
          : player?.columns.map((col, colIdx) =>
          col.map((cell, rowFromBottom) => {
            const rowFromTop = gridRows - 1 - rowFromBottom;
            const isSelected = selectedSet.has(cell.id);
            return (
              <button
                key={cell.id}
                className={`grid-tile grid-tile--landed${isSelected ? ' grid-tile--selected' : ''}${errorTileId === cell.id ? ' grid-tile--error' : ''}${hintCellId === cell.id ? ' grid-tile--hint' : ''}${tapOkTileId === cell.id ? ' grid-tile--tap-ok' : ''}`}
                style={{
                  left: `${colIdx * colPct}%`,
                  top: `${rowFromTop * rowPct}%`,
                  width: `${colPct}%`,
                  height: `${rowPct}%`,
                  background: tileColor(cell.letter),
                }}
                onPointerDown={e => handleTapTile(cell.id, e)}
                {...TILE_BUTTON_ATTRS}
              >
                <LetterGlyph letter={cell.letter} language={gameLanguage} />
                {hintCellId === cell.id && (
                  <span className="grid-tile__hint-badge">{t.hintBadge}</span>
                )}
              </button>
            );
          }),
        )}

        {wordCompleteFx?.hasBurst && (
          <WordCompleteBurst key={wordCompleteFx.runId} fx={wordCompleteFx} language={gameLanguage} />
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
            aria-label={t.soloComplete}
          >
            {epicBadgeLabel && <div className="victory-epic-badge">{epicBadgeLabel}</div>}
            {!celebrationEpic && isNewBest && <div className="new-best-badge">{t.newBest}</div>}
            <div className="victory-popup__score">{snapshotScore}</div>
            <div className="victory-popup__score-label">
              {snapshotScore === 1 ? t.point : t.points}
            </div>
            {!isNewBest && snapshotPreviousBest > 0 && (
              <div className="best-score-chip victory-popup__best">
                <span className="best-score-chip__label">{t.yourBest}</span>
                <span className="best-score-chip__value">{snapshotPreviousBest}</span>
              </div>
            )}
            {hasVictoryBadges && (
              <BadgeReveal
                sessionBadges={sessionBadges}
                lifetimeBefore={lifetimeBadgeBefore}
                embedded
              />
            )}
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
            {needsNamePrompt && (
              <div className="victory-popup__name">
                <label htmlFor="victory-name-input" className="victory-popup__name-label">
                  {t.leaderboardNamePrompt}
                </label>
                <input
                  ref={victoryNameInputRef}
                  id="victory-name-input"
                  className="victory-popup__name-input"
                  type="text"
                  value={victoryNameDraft}
                  maxLength={20}
                  placeholder={t.namePlaceholder}
                  onChange={e => setVictoryNameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && victoryActionsEnabled) {
                      handleVictoryAction('playAgain');
                    }
                  }}
                  autoComplete="nickname"
                  enterKeyHint="done"
                />
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
