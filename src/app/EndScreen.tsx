import { useCallback, useEffect, useRef, useState } from 'react';
import type { MatchResult } from '../multiplayer/types';
import { totalBadgeCount, type BadgeCounts } from '../domain/badges';
import { useI18n } from '../i18n';
import { BadgeReveal } from './BadgeReveal';

/** Ignore taps briefly after mount so a lift from the game grid/skip bar cannot hit Play Again. */
const END_ACTION_DELAY_MS = 500;

interface Props {
  score: number;
  bestScore: number;
  sessionBadges: BadgeCounts;
  lifetimeBefore: BadgeCounts;
  onPlayAgain: () => void;
  onBackToMenu?: () => void;
  isMultiplayer?: boolean;
  opponentScore?: number;
  opponentName?: string;
  opponentWantsRematch?: boolean;
  opponentResigned?: boolean;
  result?: MatchResult | null;
  /** Multiplayer: opponent hasn't reported their final score yet — hold the result. */
  resolving?: boolean;
  /** Badges were already shown (e.g. solo victory popup) — skip the loot reveal. */
  skipBadgeReveal?: boolean;
}

export function EndScreen({
  score,
  bestScore,
  sessionBadges,
  lifetimeBefore,
  onPlayAgain,
  onBackToMenu,
  isMultiplayer = false,
  opponentScore = 0,
  opponentName: _opponentName,
  opponentWantsRematch = false,
  opponentResigned = false,
  result = null,
  resolving = false,
  skipBadgeReveal = false,
}: Props) {
  const { t } = useI18n();
  const [actionsEnabled, setActionsEnabled] = useState(false);
  const [badgeRevealDone, setBadgeRevealDone] = useState(false);
  const prevShowBadgeRevealRef = useRef(false);
  const hasSessionBadges = totalBadgeCount(sessionBadges) > 0;
  const showBadgeReveal = hasSessionBadges && !skipBadgeReveal;
  const isNewBest = !isMultiplayer && score > 0 && score >= bestScore;

  const handleBadgeRevealComplete = useCallback(() => {
    setBadgeRevealDone(true);
  }, []);

  useEffect(() => {
    if (showBadgeReveal && !prevShowBadgeRevealRef.current) {
      setBadgeRevealDone(false);
      setActionsEnabled(false);
    }
    if (!showBadgeReveal) {
      setBadgeRevealDone(true);
    }
    prevShowBadgeRevealRef.current = showBadgeReveal;
  }, [showBadgeReveal]);

  useEffect(() => {
    if (!showBadgeReveal) return;
    const fallback = window.setTimeout(() => setBadgeRevealDone(true), 12_000);
    return () => window.clearTimeout(fallback);
  }, [showBadgeReveal]);

  useEffect(() => {
    if (!badgeRevealDone) return;
    const timer = window.setTimeout(() => setActionsEnabled(true), END_ACTION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [badgeRevealDone]);

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
    <div className={`screen end-screen${showBadgeReveal && !badgeRevealDone ? ' end-screen--badge-loot' : ''}${badgeRevealDone && showBadgeReveal ? ' end-screen--badges-done' : ''}`}>
      <div className={`end-content${showBadgeReveal ? ' end-content--with-badges' : ''}`}>
        <div className="end-content__summary">
        {isMultiplayer ? (
          <>
            {resolving ? (
              <h2 className="end-title end-result end-result--resolving">
                {t.waitingForOpponent}
              </h2>
            ) : (
              <h2 className={`end-title end-result ${result ? RESULT_CLASSES[result] : ''}`}>
                {result ? RESULT_LABELS[result] : ''}
              </h2>
            )}
            {opponentResigned && !resolving && (
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
              <div className="best-score-chip end-content__best">
                <span className="best-score-chip__label">{t.yourBest}</span>
                <span className="best-score-chip__value">{bestScore}</span>
              </div>
            )}
          </>
        )}

        {showBadgeReveal && (
          <BadgeReveal
            sessionBadges={sessionBadges}
            lifetimeBefore={lifetimeBefore}
            onComplete={handleBadgeRevealComplete}
          />
        )}
        </div>

        <div className="end-content__footer">
        {opponentWantsRematch && (
          <div className="rematch-nudge">
            {t.opponentWantsRematch}
          </div>
        )}

        <div className={`end-buttons${actionsEnabled ? '' : ' end-buttons--locked'}`}>
          {!(isMultiplayer && opponentResigned) && (
            <button
              className="play-btn"
              disabled={!actionsEnabled || resolving}
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
    </div>
  );
}
