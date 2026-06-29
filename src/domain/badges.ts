import { SECONDS_PER_LETTER } from './constants';

/** Per-word gameplay badges (earned during a match). */
export type GameplayBadgeId =
  | 'fast_1'
  | 'fast_2'
  | 'double'
  | 'streak_2'
  | 'streak_3'
  | 'streak_4'
  | 'streak_5'
  | 'streak_6'
  | 'streak_7';

/** Lifetime milestone badges (unlocked once). */
export type MilestoneBadgeId =
  | 'mp_debut'
  | 'mp_sparring'
  | 'mp_arena'
  | 'mp_gladiator'
  | 'mp_legend'
  | 'mp_champion'
  | 'mp_dominator'
  | 'solo_debut'
  | 'solo_grinder';

export type BadgeId = GameplayBadgeId | MilestoneBadgeId;

export type BadgeCounts = Record<BadgeId, number>;

export type SpeedBadgeTier = 1 | 2;

export const STREAK_BADGE_THRESHOLDS = [2, 3, 4, 5, 6, 7] as const;

export const GAMEPLAY_BADGE_IDS: GameplayBadgeId[] = [
  'fast_1',
  'fast_2',
  'double',
  'streak_2',
  'streak_3',
  'streak_4',
  'streak_5',
  'streak_6',
  'streak_7',
];

export const MILESTONE_BADGE_IDS: MilestoneBadgeId[] = [
  'mp_debut',
  'mp_sparring',
  'mp_arena',
  'mp_gladiator',
  'mp_legend',
  'mp_champion',
  'mp_dominator',
  'solo_debut',
  'solo_grinder',
];

export const BADGE_IDS: BadgeId[] = [...GAMEPLAY_BADGE_IDS, ...MILESTONE_BADGE_IDS];

export const EMPTY_BADGE_COUNTS: BadgeCounts = Object.fromEntries(
  BADGE_IDS.map(id => [id, 0]),
) as BadgeCounts;

export function badgeIdFromBonus(kind: 'fast' | 'streak' | 'double', tier: number): BadgeId {
  if (kind === 'double') return 'double';
  if (kind === 'streak') return `streak_${tier}` as BadgeId;
  return `fast_${tier}` as BadgeId;
}

export function streakBadgeId(streak: number): GameplayBadgeId | null {
  if (streak < 2 || streak > 7) return null;
  return `streak_${streak}` as GameplayBadgeId;
}

export function isMilestoneBadge(id: BadgeId): id is MilestoneBadgeId {
  return (MILESTONE_BADGE_IDS as readonly string[]).includes(id);
}

export function mergeBadgeCounts(base: BadgeCounts, delta: Partial<BadgeCounts>): BadgeCounts {
  const next = { ...base };
  for (const id of BADGE_IDS) {
    const add = delta[id] ?? 0;
    if (add > 0) next[id] = (next[id] ?? 0) + add;
  }
  return next;
}

export function addBadgeIds(counts: BadgeCounts, ids: BadgeId[]): BadgeCounts {
  const delta: Partial<BadgeCounts> = {};
  for (const id of ids) {
    delta[id] = (delta[id] ?? 0) + 1;
  }
  return mergeBadgeCounts(counts, delta);
}

function readCount(raw: Record<string, unknown>, key: string): number {
  const value = raw[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

/** Parse stored counts; fold legacy keys into the current model. */
export function parseBadgeCounts(raw: unknown): BadgeCounts {
  const counts = { ...EMPTY_BADGE_COUNTS };
  if (!raw || typeof raw !== 'object') return counts;
  const obj = raw as Record<string, unknown>;

  const hasLegacyTiers =
    readCount(obj, 'fast_3') > 0 ||
    readCount(obj, 'fast_4') > 0 ||
    readCount(obj, 'rare_1') > 0 ||
    readCount(obj, 'rare_2') > 0 ||
    readCount(obj, 'rare_3') > 0 ||
    readCount(obj, 'rare_4') > 0;

  if (hasLegacyTiers) {
    counts.fast_1 = readCount(obj, 'fast_1') + readCount(obj, 'fast_2');
    counts.fast_2 = readCount(obj, 'fast_3') + readCount(obj, 'fast_4');
    counts.double = readCount(obj, 'double');
  } else {
    for (const id of BADGE_IDS) {
      counts[id] = readCount(obj, id);
    }
  }

  return counts;
}

export function earnedBadgeIds(session: BadgeCounts): BadgeId[] {
  return BADGE_IDS.filter(id => (session[id] ?? 0) > 0);
}

export function unlockedBadgeIds(counts: BadgeCounts): BadgeId[] {
  return BADGE_IDS.filter(id => (counts[id] ?? 0) > 0);
}

export function totalBadgeCount(counts: BadgeCounts): number {
  return BADGE_IDS.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
}

export function uniqueBadgesUnlocked(counts: BadgeCounts): number {
  return BADGE_IDS.filter(id => (counts[id] ?? 0) > 0).length;
}

/**
 * Absolute solve-speed tiers in ms per letter (fair baseline ≈ SECONDS_PER_LETTER).
 * Tier 1 = FAST, tier 2 = LIGHTNING.
 */
const FAST_BADGE_MS_PER_LETTER: Record<SpeedBadgeTier, number> = {
  1: SECONDS_PER_LETTER * 1000 * 0.68,
  2: SECONDS_PER_LETTER * 1000 * 0.48,
};

export function resolveFastBadgeTier(elapsedMs: number, wordLength: number): SpeedBadgeTier | null {
  if (wordLength <= 0 || elapsedMs < 0) return null;

  const msPerLetter = elapsedMs / wordLength;
  if (msPerLetter <= FAST_BADGE_MS_PER_LETTER[2]) return 2;
  if (msPerLetter <= FAST_BADGE_MS_PER_LETTER[1]) return 1;
  return null;
}
