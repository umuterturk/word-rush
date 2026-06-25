import { useEffect, useState } from 'react';
import type { MatchResult } from '../multiplayer/types';
import { useI18n } from '../i18n';

/** Ignore taps briefly after mount so a lift from the game grid/skip bar cannot hit Play Again. */
const END_ACTION_DELAY_MS = 500;

interface Props {
  score: number;
  bestScore: number;
  onPlayAgain: () => void;
  onBackToMenu?: () => void;
  isMultiplayer?: boolean;
  opponentScore?: number;
  opponentName?: string;
  opponentWantsRematch?: boolean;
  opponentResigned?: boolean;
  result?: MatchResult | null;
}

export function EndScreen({
  score,
  bestScore,
  onPlayAgain,
  onBackToMenu,
  isMultiplayer = false,
  opponentScore = 0,
  opponentName: _opponentName,
  opponentWantsRematch = false,
  opponentResigned = false,
  result = null,
}: Props) {
  const { t } = useI18n();
  const [actionsEnabled, setActionsEnabled] = useState(false);
  const isNewBest = !isMultiplayer && score > 0 && score >= bestScore;

  useEffect(() => {
    const timer = window.setTimeout(() => setActionsEnabled(true), END_ACTION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const RESULT_LABELS: Record<MatchResult, string> = {
    win: t.youWin,
    lose: t.youLose,
    tie: t.tieGame,
  };

  const RESULT_CLASSES: Record<MatchResult, string> = {
    win: 'result-win',
    lose: 'result-lose',
    tie: 'result-tie',
  };

  return (
    <div className="screen end-screen">
      <div className="end-content">
        {isMultiplayer && result ? (
          <>
            <h2 className={`end-title end-result ${RESULT_CLASSES[result]}`}>
              {RESULT_LABELS[result]}
            </h2>
            {opponentResigned && (
              <div className="end-resign-note">{t.opponentResigned}</div>
            )}
            <div className="end-vs-scores">
              <div className="end-vs-player">
                <span className="end-vs-label">{t.you}</span>
                <span className="end-score">{score}</span>
              </div>
              <span className="end-vs-divider">{t.vs}</span>
              <div className="end-vs-player">
                <span className="end-vs-label">{t.them}</span>
                <span className="end-score end-score--opp">{opponentScore}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="end-title">{t.soloComplete}</h2>
            {isNewBest && <div className="new-best-badge">{t.newBest}</div>}
            <div className="end-score">{score}</div>
            <div className="end-score-label">
              {score === 1 ? t.point : t.points}
            </div>
            {!isNewBest && bestScore > 0 && (
              <div className="best-score-chip">
                <span className="best-score-chip__label">{t.yourBest}</span>
                <span className="best-score-chip__value">{bestScore}</span>
              </div>
            )}
          </>
        )}

        {opponentWantsRematch && (
          <div className="rematch-nudge">
            {t.opponentWantsRematch}
          </div>
        )}

        <div className={`end-buttons${actionsEnabled ? '' : ' end-buttons--locked'}`}>
          {!(isMultiplayer && opponentResigned) && (
            <button
              className="play-btn"
              disabled={!actionsEnabled}
              onPointerDown={e => e.preventDefault()}
              onClick={onPlayAgain}
            >
              {isMultiplayer ? t.rematch : t.playAgain}
            </button>
          )}
          {onBackToMenu && (
            <button
              className="play-btn play-btn--secondary"
              disabled={!actionsEnabled}
              onPointerDown={e => e.preventDefault()}
              onClick={onBackToMenu}
            >
              {t.menu}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
