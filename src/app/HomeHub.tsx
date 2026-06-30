import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type { BadgeCounts } from '../domain/badges';
import type { PlayerLifetimeStats } from '../domain/playerStats';
import type { LeaderboardEntry } from '../ports';
import {
  earnedBadgesForHome,
  totalGameplayBadgeCount,
  type HomeEarnedBadge,
} from './homeBadgeDisplay';
import { badgeKindClass, getBadgeIcon, getBadgeLabel } from './badgeLabels';
import { BadgeDetailPopup } from './BadgeDetailPopup';
import { HomeDailyTop3 } from './HomeDailyTop3';
import { HomeLetterRain } from './HomeLetterRain';
import { useHomeHubCompact } from './useHomeHubCompact';

const HOME_TROPHY_CAP = 10;

interface Props {
  bestScore: number;
  username: string;
  badgeStats: BadgeCounts;
  lifetimeStats: PlayerLifetimeStats;
  todayLeaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
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
  todayLeaderboard,
  leaderboardLoading,
  multiplayerAvailable,
  onPlaySolo,
  onPlayWithFriend,
  onDevGrantRandomBadges,
}: Props) {
  const { t } = useI18n();
  const [selectedBadge, setSelectedBadge] = useState<HomeEarnedBadge | null>(null);
  const earned = useMemo(() => earnedBadgesForHome(badgeStats), [badgeStats]);
  const visibleTrophies = earned.slice(0, HOME_TROPHY_CAP);
  const overflowCount = Math.max(0, earned.length - HOME_TROPHY_CAP);
  const skillTotal = totalGameplayBadgeCount(badgeStats);
  const totalGames =
    lifetimeStats.soloGamesCompleted + lifetimeStats.multiplayerGamesCompleted;
  const displayName = username.trim();
  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : '?';
  const hasNewBest = bestScore > 0;
  const hubRef = useHomeHubCompact([
    earned.length,
    todayLeaderboard.length,
    leaderboardLoading,
    multiplayerAvailable,
    hasNewBest,
  ]);

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
    <>
      <div className="home-hub" ref={hubRef} data-compact="0">
        <HomeLetterRain />

        <div className="home-hub__stack">
        <header className="home-hub__header">
          <div className="home-hub__title-wrap">
            <h1 className="home-hub__title">{t.gameTitle}</h1>
            <div className="home-hub__title-glow" aria-hidden="true" />
          </div>
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

        <div className="home-hub__optional home-hub__optional--daily">
          <HomeDailyTop3 entries={todayLeaderboard} loading={leaderboardLoading} />
        </div>

        {earned.length > 0 && (
          <section
            className="home-trophy-strip home-hub__optional home-hub__optional--badges"
            aria-label={t.homeEarnedBadgesLabel}
          >
            <h2 className="home-section-label">{t.homeTrophies}</h2>
            <div className="home-trophy-strip__scroll" role="list">
              {visibleTrophies.map(entry => {
                const id = entry.id;
                const label = getBadgeLabel(t, id);
                return (
                  <button
                    key={`${entry.kind}-${id}`}
                    type="button"
                    role="listitem"
                    className={`home-trophy-chip home-trophy-chip--${entry.kind} ${badgeKindClass(id)}`}
                    aria-label={entry.kind === 'skill' ? `${label} ×${entry.count}` : label}
                    onClick={() => setSelectedBadge(entry)}
                  >
                    <span className="home-trophy-chip__icon" aria-hidden="true">
                      {getBadgeIcon(id)}
                    </span>
                    {entry.kind === 'skill' && (
                      <span className="home-trophy-chip__count">{entry.count}</span>
                    )}
                  </button>
                );
              })}
              {overflowCount > 0 && (
                <span className="home-trophy-chip home-trophy-chip--more" aria-hidden="true">
                  +{overflowCount}
                </span>
              )}
            </div>
          </section>
        )}

        </div>

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
      </div>

      {selectedBadge && (
        <BadgeDetailPopup badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </>
  );
}
