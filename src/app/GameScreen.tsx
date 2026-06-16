import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameAction, GameState } from '../domain/types';
import { GRID_COLS, GRID_ROWS, SKIP_PENALTY, LETTER_HINT_DELAY_MS } from '../domain/constants';
import type { ClockPort } from '../ports';
import { useI18n } from '../i18n';
import { getPlayerWordDuration, formatDoubleBonusMultiplierLabel, findHintCellId, getCellById, isCorrectNextLetter, computeWordPoints } from '../domain/gridUtils';
import { upperByLanguage } from '../domain/turkishText';

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
      className={`screen game-screen${isMultiplayer ? ' game-screen--vs' : ''}`}
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
      <div className="target-word-banner notranslate" lang={language} translate="no">
        {targetWord ? (
          <>
            <span className="target-word-label">{t.find}</span>
            <span className="target-word-text">
              {Array.from(targetWord).map((ch, i) => (
                <span key={i} className="letter-glyph" translate="no">{upperByLanguage(ch, language)}</span>
              ))}
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

      {/* Grid arena container with timer */}
      <div className="arena-container">
        {/* Vertical word timer bar */}
        {targetWord && wordDuration > 0 && (
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
          className={`arena grid-arena notranslate${isShuffling ? ' grid-arena--shuffling' : ''}`}
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
        {player?.columns.map((col, colIdx) =>
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

      {/* Word panel */}
      <div
        className={`word-panel notranslate${submitFeedback === 'valid' ? ' word-panel--valid' : ''}${submitFeedback === 'invalid' ? ' word-panel--invalid' : ''}`}
        lang={language}
        translate="no"
      >
        <div className={`formed-word-row${wordMatchesTarget ? ' formed-word-row--match' : ''}`}>
          {selectedIds.length === 0 ? (
            <span className="formed-word-placeholder">{t.tapToSpell}</span>
          ) : (
            selectedIds.map((id, i) => {
              const letter = letterMap.get(id) ?? '';
              return (
                <button
                  key={id}
                  className="formed-letter"
                  onPointerDown={e => { e.preventDefault(); handleTapTile(id, e); }}
                  {...TILE_BUTTON_ATTRS}
                >
                  <LetterGlyph letter={letter} language={language} />
                  {i === selectedIds.length - 1 && wordMatchesTarget && (
                    <span className="formed-letter__score">+{wordScore}</span>
                  )}
                </button>
              );
            })
          )}
        </div>

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
    </div>
  );
}
