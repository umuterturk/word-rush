import type { MatchResult } from '../multiplayer/types';
import { useI18n } from '../i18n';

interface Props {
  score: number;
  bestScore: number;
  onPlayAgain: () => void;
  onBackToMenu?: () => void;
  isMultiplayer?: boolean;
  opponentScore?: number;
  opponentName?: string;
  opponentWantsRematch?: boolean;
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
  result = null,
}: Props) {
  const { t } = useI18n();
  const isNewBest = !isMultiplayer && score > 0 && score >= bestScore;

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
            <h2 className="end-title">{t.timesUp}</h2>
            {isNewBest && <div className="new-best-badge">{t.newBest}</div>}
            <div className="end-score">{score}</div>
            <div className="end-score-label">
              {score === 1 ? t.point : t.points}
            </div>
            {!isNewBest && bestScore > 0 && (
              <div className="best-score-chip">{t.best} {bestScore}</div>
            )}
          </>
        )}

        {opponentWantsRematch && (
          <div className="rematch-nudge">
            {t.opponentWantsRematch}
          </div>
        )}

        <div className="end-buttons">
          <button className="play-btn" onClick={onPlayAgain}>
            {isMultiplayer ? t.rematch : t.playAgain}
          </button>
          {onBackToMenu && (
            <button className="play-btn play-btn--secondary" onClick={onBackToMenu}>
              {t.menu}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
