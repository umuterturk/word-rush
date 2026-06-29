import {
  BADGE_IDS,
  isMilestoneBadge,
  type BadgeCounts,
  type BadgeId,
} from '../domain/badges';

/** Dev-only: grant a random handful of badges to exercise home / profile UI. */
export function randomDevBadgeDelta(): Partial<BadgeCounts> {
  const grantCount = 1 + Math.floor(Math.random() * 4);
  const pool = [...BADGE_IDS];
  const delta: Partial<BadgeCounts> = {};

  for (let i = 0; i < grantCount && pool.length > 0; i += 1) {
    const index = Math.floor(Math.random() * pool.length);
    const id = pool.splice(index, 1)[0] as BadgeId;
    delta[id] = isMilestoneBadge(id)
      ? 1
      : 1 + Math.floor(Math.random() * 12);
  }

  return delta;
}
