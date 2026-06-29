import type { MatchResult } from '../multiplayer/types';
import { totalBadgeCount, type BadgeCounts } from '../domain/badges';
import { useI18n } from '../i18n';
import { BadgeReveal } from './BadgeReveal';

interface Props {
  sessionBadges: BadgeCounts;
  lifetimeBefore: BadgeCounts;
  result: MatchResult | null;
  resolving: boolean;
  opponentResigned: boolean;
  opponentWantsRematch: boolean;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function MultiplayerEndOverlay({
  sessionBadges,
  lifetimeBefore,
  result,
  resolving,
  opponentResigned,
  opponentWantsRematch,
  onPlayAgain,
  onBackToMenu,
}: Props) {
  const { t } = useI18n();
  const hasSessionBadges = totalBadgeCount(sessionBadges) > 0;

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
    <div className="mp-end-overlay" role="dialog" aria-modal="true" aria-label={t.badgesCollectedTitle}>
      <div className="mp-end-overlay__panel">
        {resolving ? (
          <h2 className="mp-end-overlay__result mp-end-overlay__result--resolving">
            {t.waitingForOpponent}
          </h2>
        ) : result ? (
          <h2 className={`mp-end-overlay__result ${RESULT_CLASSES[result]}`}>
            {RESULT_LABELS[result]}
          </h2>
        ) : null}

        {opponentResigned && !resolving && (
          <p className="mp-end-overlay__note">{t.opponentResigned}</p>
        )}

        {hasSessionBadges && (
          <div className="mp-end-overlay__badges">
            <BadgeReveal sessionBadges={sessionBadges} lifetimeBefore={lifetimeBefore} />
          </div>
        )}

        {opponentWantsRematch && (
          <p className="rematch-nudge">{t.opponentWantsRematch}</p>
        )}

        <div className="mp-end-overlay__actions end-buttons">
          {!(opponentResigned) && (
            <button
              type="button"
              className="play-btn"
              disabled={resolving}
              onClick={onPlayAgain}
            >
              {t.rematch}
            </button>
          )}
          <button type="button" className="play-btn play-btn--secondary" onClick={onBackToMenu}>
            {t.menu}
          </button>
        </div>
      </div>
    </div>
  );
}
