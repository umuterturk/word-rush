import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useI18n } from '../i18n';
import type { BadgeCounts } from '../domain/badges';
import type { PlayerLifetimeStats } from '../domain/playerStats';
import {
  earnedBadgesForHome,
  floatBadgePosition,
  totalGameplayBadgeCount,
  type HomeEarnedBadge,
} from './homeBadgeDisplay';
import { badgeKindClass, getBadgeIcon, getBadgeLabel, getBadgeShortLabel } from './badgeLabels';
import { BadgeDetailPopup } from './BadgeDetailPopup';
import { HomeLetterRain } from './HomeLetterRain';

interface Props {
  bestScore: number;
  username: string;
  badgeStats: BadgeCounts;
  lifetimeStats: PlayerLifetimeStats;
  multiplayerAvailable: boolean;
  onPlaySolo: () => void;
  onPlayWithFriend: () => void;
  onDevGrantRandomBadges?: () => void;
}

export function HomeHub({
  bestScore,
  username,
  badgeStats,
  lifetimeStats,
  multiplayerAvailable,
  onPlaySolo,
  onPlayWithFriend,
  onDevGrantRandomBadges,
}: Props) {
  const { t } = useI18n();
  const [selectedBadge, setSelectedBadge] = useState<HomeEarnedBadge | null>(null);
  const earned = useMemo(() => earnedBadgesForHome(badgeStats), [badgeStats]);
  const skillTotal = totalGameplayBadgeCount(badgeStats);
  const totalGames =
    lifetimeStats.soloGamesCompleted + lifetimeStats.multiplayerGamesCompleted;
  const displayName = username.trim();
  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : '?';
  const hasNewBest = bestScore > 0;

  useEffect(() => {
    if (!import.meta.env.DEV || !onDevGrantRandomBadges) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key !== 'c' && e.code !== 'KeyC') return;
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      e.preventDefault();
      onDevGrantRandomBadges?.();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDevGrantRandomBadges]);

  return (
    <div className="home-hub">
      <HomeLetterRain />

      <header className="home-hub__header">
        <div className="home-hub__title-wrap">
          <h1 className="home-hub__title">{t.gameTitle}</h1>
          <div className="home-hub__title-glow" aria-hidden="true" />
        </div>
        <p className="home-hub__tagline">{t.homeTagline}</p>
      </header>

      <div className={`home-score-card${hasNewBest ? ' home-score-card--lit' : ''}`}>
        <div className="home-score-card__avatar" aria-hidden="true">
          {avatarLetter}
        </div>
        <div className="home-score-card__main">
          <span className="home-score-card__label">{t.yourBest}</span>
          <span className="home-score-card__value">{hasNewBest ? bestScore : '—'}</span>
        </div>
        <div className="home-score-card__aside">
          <span className="home-score-card__stat">
            <strong>{totalGames}</strong>
            <em>{t.homeGamesPlayed}</em>
          </span>
          <span className="home-score-card__stat">
            <strong>{skillTotal}</strong>
            <em>{t.homeSkillPoints}</em>
          </span>
        </div>
      </div>

      {earned.length > 0 && (
        <section className="home-float-badges" aria-label={t.homeEarnedBadgesLabel}>
          <div className="home-float-badges__field" role="list">
            {earned.map((entry, index) => {
              const id = entry.id;
              const label = getBadgeLabel(t, id);
              const shortLabel = getBadgeShortLabel(t, id);
              const pos = floatBadgePosition(index, earned.length);
              const style = {
                '--float-i': index,
                '--float-x': `${pos.x}%`,
                '--float-y': `${pos.y}%`,
                '--float-duration': `${2.6 + (index % 4) * 0.45}s`,
                '--float-delay': `${(index % 7) * 0.22}s`,
              } as CSSProperties;

              return (
                <button
                  key={`${entry.kind}-${id}`}
                  type="button"
                  role="listitem"
                  className={`home-float-badge home-float-badge--${entry.kind} ${badgeKindClass(id)}`}
                  style={style}
                  aria-label={
                    entry.kind === 'skill' ? `${label} ×${entry.count}` : label
                  }
                  onClick={() => setSelectedBadge(entry)}
                >
                  <div className="home-float-badge__icon-wrap">
                    <span className="home-float-badge__glow" aria-hidden="true" />
                    <span className="home-float-badge__icon" aria-hidden="true">
                      {getBadgeIcon(id)}
                    </span>
                    {entry.kind === 'skill' && (
                      <span className="home-float-badge__count">×{entry.count}</span>
                    )}
                  </div>
                  <span className="home-float-badge__name">{shortLabel}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="home-play-zone">
        <button type="button" className="home-play-btn home-play-btn--solo" onClick={onPlaySolo}>
          <span className="home-play-btn__shine" aria-hidden="true" />
          <span className="home-play-btn__text">{t.play}</span>
          <span className="home-play-btn__sub">{t.homePlaySoloHint}</span>
        </button>
        {multiplayerAvailable && (
          <button
            type="button"
            className="home-play-btn home-play-btn--rival"
            onClick={onPlayWithFriend}
          >
            <span className="home-play-btn__shine" aria-hidden="true" />
            <span className="home-play-btn__text">{t.playWithFriend}</span>
            <span className="home-play-btn__sub">{t.homePlayRivalHint}</span>
          </button>
        )}
      </div>

      {selectedBadge && (
        <BadgeDetailPopup badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  );
}
