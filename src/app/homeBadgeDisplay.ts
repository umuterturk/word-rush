import {
  GAMEPLAY_BADGE_IDS,
  type BadgeCounts,
  type BadgeId,
  type GameplayBadgeId,
  type MilestoneBadgeId,
} from '../domain/badges';

export const SOLO_MILESTONE_TRACK: MilestoneBadgeId[] = ['solo_debut', 'solo_grinder'];

export const MP_GAMES_MILESTONE_TRACK: MilestoneBadgeId[] = [
  'mp_debut',
  'mp_sparring',
  'mp_arena',
  'mp_gladiator',
  'mp_legend',
];

export const MP_WINS_MILESTONE_TRACK: MilestoneBadgeId[] = ['mp_champion', 'mp_dominator'];

export type MilestoneTrackId = 'solo' | 'mpGames' | 'mpWins';

export const MILESTONE_TRACKS: Record<MilestoneTrackId, MilestoneBadgeId[]> = {
  solo: SOLO_MILESTONE_TRACK,
  mpGames: MP_GAMES_MILESTONE_TRACK,
  mpWins: MP_WINS_MILESTONE_TRACK,
};

export type HomeEarnedBadge =
  | { kind: 'title'; id: MilestoneBadgeId }
  | { kind: 'skill'; id: GameplayBadgeId; count: number };

/** Highest unlocked milestone per track — achievement badges only show the top rank. */
export function highestMilestoneInTrack(
  track: readonly MilestoneBadgeId[],
  counts: BadgeCounts,
): MilestoneBadgeId | null {
  let highest: MilestoneBadgeId | null = null;
  for (const id of track) {
    if ((counts[id] ?? 0) > 0) highest = id;
  }
  return highest;
}

export function earnedTitlesForHome(counts: BadgeCounts): MilestoneBadgeId[] {
  return (Object.keys(MILESTONE_TRACKS) as MilestoneTrackId[])
    .map(track => highestMilestoneInTrack(MILESTONE_TRACKS[track], counts))
    .filter((id): id is MilestoneBadgeId => id != null);
}

/** Gameplay badges with counts, sorted for display (flashiest first). */
export function gameplayBadgesForHome(counts: BadgeCounts): { id: GameplayBadgeId; count: number }[] {
  const order = new Map(GAMEPLAY_BADGE_IDS.map((id, index) => [id, index]));

  return GAMEPLAY_BADGE_IDS.map(id => ({ id, count: counts[id] ?? 0 }))
    .filter(entry => entry.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
    });
}

/** All earned badges for the home screen — titles first, then skill loot with counts. */
export function earnedBadgesForHome(counts: BadgeCounts): HomeEarnedBadge[] {
  const titles: HomeEarnedBadge[] = earnedTitlesForHome(counts).map(id => ({
    kind: 'title',
    id,
  }));
  const skills: HomeEarnedBadge[] = gameplayBadgesForHome(counts).map(({ id, count }) => ({
    kind: 'skill',
    id,
    count,
  }));
  return [...titles, ...skills];
}

export function totalGameplayBadgeCount(counts: BadgeCounts): number {
  return gameplayBadgesForHome(counts).reduce((sum, b) => sum + b.count, 0);
}

export function badgeIdFromEarned(entry: HomeEarnedBadge): BadgeId {
  return entry.id;
}

/** Scatter positions (percent) for floating icon layout. */
export function floatBadgePosition(index: number, total: number): { x: number; y: number } {
  if (total <= 0) return { x: 50, y: 50 };

  const cols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(total))));
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);

  const cellW = 78 / cols;
  const cellH = rows > 1 ? 82 / rows : 0;

  const jitterX = ((index * 17) % 11) - 5;
  const jitterY = ((index * 13) % 9) - 4;

  return {
    x: 11 + col * cellW + cellW * 0.5 + jitterX,
    y: 14 + row * cellH + jitterY,
  };
}
