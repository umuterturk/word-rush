import { MATCH_DURATION_MS } from '../domain/constants';
import { useI18n } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
  bestScore: number;
  multiplayerAvailable: boolean;
  onPlaySolo: () => void;
  onPlayWithFriend: () => void;
}

const MATCH_MINUTES = Math.round(MATCH_DURATION_MS / 60_000);

export function StartScreen({
  bestScore,
  multiplayerAvailable,
  onPlaySolo,
  onPlayWithFriend,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="screen start-screen">
      <div className="start-content">
        <LanguageSwitcher />
        <div className="start-badge">{t.startBadge}</div>
        <h1 className="game-title">{t.gameTitle}</h1>
        <p className="game-subtitle">{t.gameSubtitle(MATCH_MINUTES)}</p>
        {bestScore > 0 && (
          <div className="best-score-chip">{t.best} {bestScore}</div>
        )}

        <div className="mode-buttons">
          <button className="play-btn" onClick={onPlaySolo}>
            {t.play}
          </button>

          {multiplayerAvailable && (
            <button className="play-btn play-btn--vs" onClick={onPlayWithFriend}>
              {t.playWithFriend}
            </button>
          )}
        </div>

        <div className="start-hint">
          {t.startHint.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i < t.startHint.split('\n').length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
