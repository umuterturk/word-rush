import { describe, expect, it } from 'vitest';
import { SECONDS_PER_LETTER } from '../constants';
import { parseBadgeCounts, resolveFastBadgeTier, streakBadgeId } from '../badges';

const fairMsPerLetter = SECONDS_PER_LETTER * 1000;

describe('resolveFastBadgeTier', () => {
  it('returns null when word length is zero', () => {
    expect(resolveFastBadgeTier(500, 0)).toBeNull();
  });

  it('returns null when solve speed is too slow', () => {
    const slow = fairMsPerLetter * 0.76 * 5;
    expect(resolveFastBadgeTier(slow, 5)).toBeNull();
  });

  it('assigns two speed tiers by absolute ms per letter', () => {
    expect(resolveFastBadgeTier(fairMsPerLetter * 0.67 * 4, 4)).toBe(1);
    expect(resolveFastBadgeTier(fairMsPerLetter * 0.47 * 4, 4)).toBe(2);
  });
});

describe('streakBadgeId', () => {
  it('maps streak counts 2–7 to badge ids', () => {
    expect(streakBadgeId(2)).toBe('streak_2');
    expect(streakBadgeId(7)).toBe('streak_7');
  });

  it('returns null outside the streak range', () => {
    expect(streakBadgeId(1)).toBeNull();
    expect(streakBadgeId(8)).toBeNull();
  });
});

describe('parseBadgeCounts', () => {
  it('folds legacy four-tier keys into two tiers', () => {
    const parsed = parseBadgeCounts({
      fast_1: 2,
      fast_2: 3,
      fast_3: 1,
      fast_4: 4,
      rare_1: 1,
      rare_2: 2,
      double: 5,
    });
    expect(parsed.fast_1).toBe(5);
    expect(parsed.fast_2).toBe(5);
    expect(parsed.double).toBe(5);
    expect(parsed.streak_2).toBe(0);
  });

  it('reads current badge keys', () => {
    expect(
      parseBadgeCounts({
        fast_1: 1,
        streak_3: 2,
        mp_debut: 1,
      }).streak_3,
    ).toBe(2);
  });
});
