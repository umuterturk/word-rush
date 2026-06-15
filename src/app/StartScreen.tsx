import { useState } from 'react';
import type { SoloDifficulty } from '../domain/types';
import type { LeaderboardEntry } from '../ports';
import { useI18n } from '../i18n';
import { InstallBanner } from './InstallBanner';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ProfilePopup } from './ProfilePopup';

interface Props {
  bestScore: number;
  username: string;
  onSaveUsername: (name: string) => void;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  multiplayerAvailable: boolean;
  onPlaySolo: (difficulty: SoloDifficulty) => void;
  onPlayWithFriend: () => void;
}

const DIFFICULTIES: { id: SoloDifficulty; labelKey: 'easy' | 'normal' | 'hard'; className: string }[] = [
  { id: 'easy', labelKey: 'easy', className: 'play-btn--easy' },
  { id: 'normal', labelKey: 'normal', className: 'play-btn--normal' },
  { id: 'hard', labelKey: 'hard', className: 'play-btn--hard' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

export function StartScreen({
  bestScore,
  username,
  onSaveUsername,
  leaderboard,
  leaderboardLoading,
  multiplayerAvailable,
  onPlaySolo,
  onPlayWithFriend,
}: Props) {
  const { t } = useI18n();
  const [showProfile, setShowProfile] = useState(false);
  const isLoggedIn = username.trim().length > 0;

  return (
    <div className="screen start-screen">
      <div className="start-top-bar">
        <button
          className={`profile-chip ${isLoggedIn ? 'profile-chip--logged-in' : ''}`}
          onClick={() => setShowProfile(true)}
        >
          {isLoggedIn ? username : t.login}
        </button>
        <LanguageSwitcher />
      </div>

      <div className="start-hero">
        <h1 className="game-title">{t.gameTitle}</h1>
      </div>

      <div className="start-content">
        {bestScore > 0 && (
          <div className="best-score-chip">
            <span className="best-score-chip__label">{t.yourBest}</span>
            <span className="best-score-chip__value">{bestScore}</span>
          </div>
        )}

        <div className="leaderboard">
          <div className="leaderboard-title">{t.leaderboard}</div>
          {leaderboardLoading ? (
            <div className="leaderboard-empty">…</div>
          ) : leaderboard.length === 0 ? (
            <div className="leaderboard-empty">{t.leaderboardEmpty}</div>
          ) : (
            <ol className="leaderboard-list">
              {leaderboard.map((entry, i) => (
                <li key={`${entry.name}-${entry.score}-${i}`} className="leaderboard-row">
                  <span className="leaderboard-rank">{MEDALS[i] ?? `${i + 1}.`}</span>
                  <span className="leaderboard-name">{entry.name}</span>
                  <span className="leaderboard-score">{entry.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

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

        <InstallBanner />
      </div>

      {showProfile && (
        <ProfilePopup
          username={username}
          onSave={onSaveUsername}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
