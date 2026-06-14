import type { SoloDifficulty } from '../domain/types';
import { useI18n } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
  bestScore: number;
  multiplayerAvailable: boolean;
  onPlaySolo: (difficulty: SoloDifficulty) => void;
  onPlayWithFriend: () => void;
}

const DIFFICULTIES: { id: SoloDifficulty; labelKey: 'easy' | 'normal' | 'hard'; className: string }[] = [
  { id: 'easy', labelKey: 'easy', className: 'play-btn--easy' },
  { id: 'normal', labelKey: 'normal', className: 'play-btn--normal' },
  { id: 'hard', labelKey: 'hard', className: 'play-btn--hard' },
];

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
        <p className="game-subtitle">{t.gameSubtitle}</p>
        {bestScore > 0 && (
          <div className="best-score-chip">{t.best} {bestScore}</div>
        )}

        <div className="mode-buttons">
          {DIFFICULTIES.map(({ id, labelKey, className }) => (
            <button
              key={id}
              className={`play-btn ${className}`}
              onClick={() => onPlaySolo(id)}
            >
              {t[labelKey]}
            </button>
          ))}

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
