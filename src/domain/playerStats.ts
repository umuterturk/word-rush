import type { BadgeId, MilestoneBadgeId } from './badges';

export interface PlayerLifetimeStats {
  soloGamesCompleted: number;
  multiplayerGamesCompleted: number;
  multiplayerWins: number;
}

export const EMPTY_PLAYER_STATS: PlayerLifetimeStats = {
  soloGamesCompleted: 0,
  multiplayerGamesCompleted: 0,
  multiplayerWins: 0,
};

type MilestoneRule = {
  id: MilestoneBadgeId;
  stat: keyof PlayerLifetimeStats;
  threshold: number;
};

export const MILESTONE_RULES: MilestoneRule[] = [
  { id: 'solo_debut', stat: 'soloGamesCompleted', threshold: 1 },
  { id: 'solo_grinder', stat: 'soloGamesCompleted', threshold: 10 },
  { id: 'mp_debut', stat: 'multiplayerGamesCompleted', threshold: 1 },
  { id: 'mp_sparring', stat: 'multiplayerGamesCompleted', threshold: 5 },
  { id: 'mp_arena', stat: 'multiplayerGamesCompleted', threshold: 10 },
  { id: 'mp_gladiator', stat: 'multiplayerGamesCompleted', threshold: 25 },
  { id: 'mp_legend', stat: 'multiplayerGamesCompleted', threshold: 50 },
  { id: 'mp_champion', stat: 'multiplayerWins', threshold: 1 },
  { id: 'mp_dominator', stat: 'multiplayerWins', threshold: 5 },
];

export function parsePlayerLifetimeStats(raw: unknown): PlayerLifetimeStats {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_PLAYER_STATS };
  const obj = raw as Record<string, unknown>;

  const read = (key: keyof PlayerLifetimeStats): number => {
    const value = obj[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
  };

  return {
    soloGamesCompleted: read('soloGamesCompleted'),
    multiplayerGamesCompleted: read('multiplayerGamesCompleted'),
    multiplayerWins: read('multiplayerWins'),
  };
}

/** Milestone badges newly crossed after a stats update. */
export function resolveNewMilestoneBadges(
  before: PlayerLifetimeStats,
  after: PlayerLifetimeStats,
): BadgeId[] {
  const unlocked: BadgeId[] = [];
  for (const rule of MILESTONE_RULES) {
    if (before[rule.stat] < rule.threshold && after[rule.stat] >= rule.threshold) {
      unlocked.push(rule.id);
    }
  }
  return unlocked;
}
