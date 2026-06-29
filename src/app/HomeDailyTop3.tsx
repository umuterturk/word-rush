import { LEADERBOARD_HOME_PREVIEW_COUNT } from '../domain/constants';
import type { LeaderboardEntry } from '../ports';
import { useI18n } from '../i18n';

const MEDALS = ['🥇', '🥈', '🥉'];

interface Props {
  entries: LeaderboardEntry[];
  loading: boolean;
}

export function HomeDailyTop3({ entries, loading }: Props) {
  const { t } = useI18n();
  const top = entries.slice(0, LEADERBOARD_HOME_PREVIEW_COUNT);

  return (
    <section className="home-daily-top" aria-label={t.leaderboardTodayHome}>
      <h2 className="home-section-label">{t.leaderboardTodayHome}</h2>
      <div className="leaderboard leaderboard--home">
        {loading ? (
          <div className="leaderboard-empty">…</div>
        ) : top.length === 0 ? (
          <div className="leaderboard-empty">{t.leaderboardEmpty}</div>
        ) : (
          <ol className="leaderboard-list">
            {top.map((entry, i) => (
              <li key={`${entry.name}-${entry.score}-${i}`} className="leaderboard-row">
                <span className="leaderboard-rank">{MEDALS[i] ?? `${i + 1}.`}</span>
                <span className="leaderboard-name">{entry.name}</span>
                <span className="leaderboard-score">{entry.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
