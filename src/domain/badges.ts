import { SECONDS_PER_LETTER } from './constants';

export type BadgeId =
  | 'fast_1'
  | 'fast_2'
  | 'rare_1'
  | 'rare_2'
  | 'double';

export type BadgeCounts = Record<BadgeId, number>;

export type SpeedBadgeTier = 1 | 2;
export type RareBadgeTier = 1 | 2;

export const BADGE_IDS: BadgeId[] = [
  'fast_1',
  'fast_2',
  'rare_1',
  'rare_2',
  'double',
];

export const EMPTY_BADGE_COUNTS: BadgeCounts = {
  fast_1: 0,
  fast_2: 0,
  rare_1: 0,
  rare_2: 0,
  double: 0,
};

export function badgeIdFromBonus(kind: 'fast' | 'rare' | 'double', tier: number): BadgeId {
  if (kind === 'double') return 'double';
  return `${kind}_${tier}` as BadgeId;
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

/** Parse stored counts and fold legacy four-tier keys into the two-tier model. */
export function parseBadgeCounts(raw: unknown): BadgeCounts {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_BADGE_COUNTS };
  const obj = raw as Record<string, unknown>;

  const hasLegacyTiers =
    readCount(obj, 'fast_3') > 0 ||
    readCount(obj, 'fast_4') > 0 ||
    readCount(obj, 'rare_3') > 0 ||
    readCount(obj, 'rare_4') > 0;

  if (hasLegacyTiers) {
    return {
      fast_1: readCount(obj, 'fast_1') + readCount(obj, 'fast_2'),
      fast_2: readCount(obj, 'fast_3') + readCount(obj, 'fast_4'),
      rare_1: readCount(obj, 'rare_1') + readCount(obj, 'rare_2'),
      rare_2: readCount(obj, 'rare_3') + readCount(obj, 'rare_4'),
      double: readCount(obj, 'double'),
    };
  }

  return {
    fast_1: readCount(obj, 'fast_1'),
    fast_2: readCount(obj, 'fast_2'),
    rare_1: readCount(obj, 'rare_1'),
    rare_2: readCount(obj, 'rare_2'),
    double: readCount(obj, 'double'),
  };
}

export function earnedBadgeIds(session: BadgeCounts): BadgeId[] {
  return BADGE_IDS.filter(id => (session[id] ?? 0) > 0);
}

export function totalBadgeCount(counts: BadgeCounts): number {
  return BADGE_IDS.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
}

/**
 * Absolute solve-speed tiers in ms per letter (fair baseline ≈ SECONDS_PER_LETTER).
 * Tier 1 = HIZLI, tier 2 = YILDIRIM HIZINDA.
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

/** Tier 1 = NADİR, tier 2 = EŞSİZ (top scarcity). */
export function resolveRareBadgeTier(scarcityMultiplier: number): RareBadgeTier | null {
  if (scarcityMultiplier >= 1.4) return 2;
  if (scarcityMultiplier >= 1.24) return 1;
  return null;
}
