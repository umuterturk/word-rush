import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction, GameState } from '../domain/types';
import { WORD_SCORE, GRID_COLS, GRID_ROWS, SKIP_PENALTY, SECONDS_PER_LETTER } from '../domain/constants';
import type { ClockPort } from '../ports';
import { useI18n } from '../i18n';
import { calculateWordDuration } from '../domain/gridUtils';

interface Props {
  gameState: GameState;
  logicalTime: number;
  bestScore: number;
  onDispatch: (action: GameAction) => void;
  clock: ClockPort;
  isMultiplayer?: boolean;
  opponentScore?: number;
  opponentName?: string;
  onScoreChange?: (score: number) => void;
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

function turkishUpper(ch: string): string {
  if (ch === 'i') return 'İ';
  if (ch === 'ı') return 'I';
  return ch.toUpperCase();
}

function tileColor(letter: string): string {
  const code = letter.charCodeAt(0);
  if (TURKISH_VOWELS.has(letter)) {
    return VOWEL_COLORS[code % VOWEL_COLORS.length];
  }
  return CONSONANT_COLORS[code % CONSONANT_COLORS.length];
}

const COL_PCT = 100 / GRID_COLS;
const ROW_PCT = 100 / GRID_ROWS;

export function GameScreen({
  gameState,
  logicalTime,
  bestScore,
  onDispatch,
  clock,
  isMultiplayer = false,
  opponentScore = 0,
  opponentName: _opponentName,
  onScoreChange,
}: Props) {
  const { t, language } = useI18n();
  const player = gameState.players['local'];
  const timeLeft = gameState.matchDuration - logicalTime;
  const isUrgent = timeLeft < 30_000;
  const localScore = player?.score ?? 0;

  const selectedIds = player?.selectedIds ?? [];
  const selectedSet = new Set(selectedIds);
  const targetWord = player?.targetWord ?? '';
  
  // Word timer calculations with board density (use clock for real-time updates)
  const wordStartedAt = player?.wordStartedAt ?? 0;
  const columns = player?.columns ?? [];
  const wordDuration = targetWord ? calculateWordDuration(targetWord.length, columns, SECONDS_PER_LETTER) : 0;
  const currentTime = gameState.matchStatus === 'playing' ? gameState.matchStartedAt + logicalTime : clock.now();
  const wordElapsed = wordStartedAt > 0 ? (currentTime - wordStartedAt) : 0;
  const wordTimeLeft = Math.max(0, wordDuration - wordElapsed);
  const wordTimerPercent = wordDuration > 0 ? (wordTimeLeft / wordDuration) * 100 : 100;

  // Build letter map for the current word display
  const letterMap = new Map<string, string>();
  if (player) {
    for (const col of player.columns) {
      for (const cell of col) letterMap.set(cell.id, cell.letter);
    }
  }

  const formedWord = selectedIds.map(id => letterMap.get(id) ?? '').join('');
  const wordMatchesTarget = formedWord === targetWord && formedWord.length >= 3;
  const wordScore = wordMatchesTarget ? (WORD_SCORE[targetWord.length] ?? 1) : 0;

  const [submitFeedback, setSubmitFeedback] = useState<'valid' | 'invalid' | null>(null);

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
      onDispatch({ type: 'SUBMIT_WORD', playerId: 'local' });
      setTimeout(() => {
        setSubmitFeedback(null);
        prevFormedRef.current = '';
      }, 500);
    }
  }, [formedWord, targetWord, onDispatch]);

  const prevScoreRef = useRef(localScore);
  useEffect(() => {
    if (onScoreChange && localScore !== prevScoreRef.current) {
      onScoreChange(localScore);
      prevScoreRef.current = localScore;
    }
  }, [localScore, onScoreChange]);

  const isLeading = isMultiplayer && localScore > opponentScore;
  const isBehind = isMultiplayer && localScore < opponentScore;

  const handleTapTile = useCallback(
    (id: string, e: React.PointerEvent) => {
      e.preventDefault();
      onDispatch({ type: 'SELECT_LETTER', playerId: 'local', letterId: id });
    },
    [onDispatch],
  );

  function handleClear() {
    onDispatch({ type: 'CLEAR_SELECTION', playerId: 'local' });
  }

  function handleSkip() {
    onDispatch({ type: 'SKIP_WORD', playerId: 'local' });
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
      {/* HUD */}
      {isMultiplayer ? (
        <div className="vs-hud">
          <div
            className={`vs-card vs-card--you${isLeading ? ' vs-card--leading' : ''}${isBehind ? ' vs-card--behind' : ''}`}
          >
            <span className="vs-card-label">{t.you}</span>
            <span key={localScore} className="vs-card-score">
              {localScore}
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
            <span key={localScore} className="hud-value hud-score">
              {localScore}
            </span>
          </div>
          <div className="hud-item">
            <span className="hud-label">{t.time}</span>
            <span className={`hud-value${isUrgent ? ' hud-urgent' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="hud-item">
            <span className="hud-label">{t.best}</span>
            <span className="hud-value">{bestScore}</span>
          </div>
        </div>
      )}

      {/* Target word banner */}
      <div className="target-word-banner">
        {targetWord ? (
          <>
            <span className="target-word-label">{t.find}</span>
            <span className="target-word-text">
              {Array.from(targetWord).map(turkishUpper).join('')}
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
        {targetWord && (
          <div className="word-timer-bar word-timer-bar--vertical">
            <div
              className="word-timer-bar__fill"
              style={{
                height: `${wordTimerPercent}%`,
              }}
            />
            <div className="word-timer-bar__text">
              {Math.ceil(wordTimeLeft / 1000)}s
            </div>
          </div>
        )}
        
        {/* Grid arena */}
        <div
          className="arena grid-arena"
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
                className={`grid-tile grid-tile--landed${isSelected ? ' grid-tile--selected' : ''}`}
                style={{
                  left: `${colIdx * COL_PCT}%`,
                  top: `${rowFromTop * ROW_PCT}%`,
                  width: `${COL_PCT}%`,
                  height: `${ROW_PCT}%`,
                  background: tileColor(cell.letter),
                }}
                onPointerDown={e => handleTapTile(cell.id, e)}
              >
                {turkishUpper(cell.letter)}
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
        className={`word-panel${submitFeedback === 'valid' ? ' word-panel--valid' : ''}${submitFeedback === 'invalid' ? ' word-panel--invalid' : ''}`}
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
                >
                  {turkishUpper(letter)}
                  {i === selectedIds.length - 1 && wordMatchesTarget && (
                    <span className="formed-letter__score">+{wordScore}</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="word-panel-actions">
          <button
            className="clear-btn"
            onClick={handleClear}
            disabled={selectedIds.length === 0}
          >
            {t.clear}
          </button>
          <button
            className="skip-btn"
            onClick={handleSkip}
            disabled={!targetWord}
            title={`Skip word (-${SKIP_PENALTY} points)`}
          >
            {t.skip(SKIP_PENALTY)}
          </button>
        </div>
      </div>
    </div>
  );
}
