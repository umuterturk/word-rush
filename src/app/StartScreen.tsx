import { useState } from 'react';
import type { SoloDifficulty } from '../domain/types';
import type { FriendEntry, LeaderboardEntry } from '../ports';
import type { BadgeCounts } from '../domain/badges';
import type { PlayerLifetimeStats } from '../domain/playerStats';
import { useI18n } from '../i18n';
import { FriendsPage } from './FriendsPage';
import { HomeHub } from './HomeHub';
import { InstallBanner } from './InstallBanner';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ProfilePopup } from './ProfilePopup';

interface Props {
  bestScore: number;
  username: string;
  badgeStats: BadgeCounts;
  lifetimeStats: PlayerLifetimeStats;
  onSaveUsername: (name: string) => void;
  weeklyLeaderboard: LeaderboardEntry[];
  todayLeaderboard: LeaderboardEntry[];
  allTimeLeaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  multiplayerAvailable: boolean;
  friendsAvailable: boolean;
  friends: FriendEntry[];
  friendsLoading: boolean;
  challengingUid: string | null;
  onPlaySolo: (difficulty: SoloDifficulty) => void;
  onPlayWithFriend: () => void;
  onChallengeFriend: (friend: FriendEntry) => void;
  onDevGrantRandomBadges?: () => void;
}

type StartPage = 'home' | 'leaderboard' | 'friends';
type LeaderboardPeriod = 'today' | 'weekly' | 'all-time';

const SOLO_MODE: SoloDifficulty = 'normal';

const MEDALS = ['🥇', '🥈', '🥉'];

function NavIconHome() {
  return (
    <svg className="start-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function NavIconLeaderboard() {
  return (
    <svg className="start-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h2v8H5V6a2 2 0 0 1 2-2Zm8 0h2a2 2 0 0 1 2 2v6h-4V4ZM4 14h4v6H4v-6Zm12 0h4v6h-4v-6ZM11 8h2v12h-2V8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function NavIconFriends() {
  return (
    <svg className="start-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 19a4 4 0 0 1 8 0H3Zm10 0h8a3 3 0 0 0-6 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  const { t } = useI18n();

  if (entries.length === 0) {
    return <div className="leaderboard-empty">{t.leaderboardEmpty}</div>;
  }

  return (
    <ol className="leaderboard-list">
      {entries.map((entry, i) => (
        <li key={`${entry.name}-${entry.score}-${i}`} className="leaderboard-row">
          <span className="leaderboard-rank">{MEDALS[i] ?? `${i + 1}.`}</span>
          <span className="leaderboard-name">{entry.name}</span>
          <span className="leaderboard-score">{entry.score}</span>
        </li>
      ))}
    </ol>
  );
}

export function StartScreen({
  bestScore,
  username,
  badgeStats,
  lifetimeStats,
  onSaveUsername,
  weeklyLeaderboard,
  todayLeaderboard,
  allTimeLeaderboard,
  leaderboardLoading,
  multiplayerAvailable,
  friendsAvailable,
  friends,
  friendsLoading,
  challengingUid,
  onPlaySolo,
  onPlayWithFriend,
  onChallengeFriend,
  onDevGrantRandomBadges,
}: Props) {
  const { t } = useI18n();
  const [showProfile, setShowProfile] = useState(false);
  const [activePage, setActivePage] = useState<StartPage>('home');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('today');
  const isLoggedIn = username.trim().length > 0;
  const activeLeaderboard =
    leaderboardPeriod === 'today'
      ? todayLeaderboard
      : leaderboardPeriod === 'weekly'
        ? weeklyLeaderboard
        : allTimeLeaderboard;

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

      <div className={`start-page${activePage === 'home' ? ' start-page--home' : ''}`}>
        {activePage === 'home' ? (
          <HomeHub
            bestScore={bestScore}
            username={username}
            badgeStats={badgeStats}
            lifetimeStats={lifetimeStats}
            multiplayerAvailable={multiplayerAvailable}
            onPlaySolo={() => onPlaySolo(SOLO_MODE)}
            onPlayWithFriend={onPlayWithFriend}
            onDevGrantRandomBadges={onDevGrantRandomBadges}
          />
        ) : activePage === 'leaderboard' ? (
          <div className="start-leaderboard-page">
            <h2 className="start-page-title">{t.leaderboard}</h2>

            <div
              className="leaderboard-tabs"
              role="tablist"
              aria-label={t.leaderboard}
            >
              <button
                type="button"
                role="tab"
                aria-selected={leaderboardPeriod === 'today'}
                className={`leaderboard-tab ${leaderboardPeriod === 'today' ? 'leaderboard-tab--active' : ''}`}
                onClick={() => setLeaderboardPeriod('today')}
              >
                {t.leaderboardToday}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leaderboardPeriod === 'weekly'}
                className={`leaderboard-tab ${leaderboardPeriod === 'weekly' ? 'leaderboard-tab--active' : ''}`}
                onClick={() => setLeaderboardPeriod('weekly')}
              >
                {t.leaderboardWeekly}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={leaderboardPeriod === 'all-time'}
                className={`leaderboard-tab ${leaderboardPeriod === 'all-time' ? 'leaderboard-tab--active' : ''}`}
                onClick={() => setLeaderboardPeriod('all-time')}
              >
                {t.leaderboardAllTime}
              </button>
            </div>

            <div className="leaderboard leaderboard--page">
              {leaderboardLoading ? (
                <div className="leaderboard-empty">…</div>
              ) : (
                <LeaderboardList entries={activeLeaderboard} />
              )}
            </div>

            <InstallBanner />
          </div>
        ) : (
          friendsAvailable && (
            <FriendsPage
              friends={friends}
              loading={friendsLoading}
              challengingUid={challengingUid}
              onChallenge={onChallengeFriend}
              onPlayWithFriend={onPlayWithFriend}
            />
          )
        )}
      </div>

      <nav className="start-nav" aria-label={t.startNavLabel}>
        <button
          type="button"
          className={`start-nav__item ${activePage === 'home' ? 'start-nav__item--active' : ''}`}
          aria-current={activePage === 'home' ? 'page' : undefined}
          onClick={() => setActivePage('home')}
        >
          <NavIconHome />
          <span className="start-nav__label">{t.navHome}</span>
        </button>
        <button
          type="button"
          className={`start-nav__item ${activePage === 'leaderboard' ? 'start-nav__item--active' : ''}`}
          aria-current={activePage === 'leaderboard' ? 'page' : undefined}
          onClick={() => setActivePage('leaderboard')}
        >
          <NavIconLeaderboard />
          <span className="start-nav__label">{t.navLeaderboard}</span>
        </button>
        {friendsAvailable && (
          <button
            type="button"
            className={`start-nav__item ${activePage === 'friends' ? 'start-nav__item--active' : ''}`}
            aria-current={activePage === 'friends' ? 'page' : undefined}
            onClick={() => setActivePage('friends')}
          >
            <NavIconFriends />
            <span className="start-nav__label">{t.navFriends}</span>
          </button>
        )}
      </nav>

      {showProfile && (
        <ProfilePopup
          username={username}
          badgeStats={badgeStats}
          onSave={onSaveUsername}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
