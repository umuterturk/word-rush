import { describe, expect, it } from 'vitest';
import { SECONDS_PER_LETTER } from '../constants';
import { parseBadgeCounts, resolveFastBadgeTier, resolveRareBadgeTier } from '../badges';

const fairMsPerLetter = SECONDS_PER_LETTER * 1000;

describe('resolveFastBadgeTier', () => {
  it('returns null when word length is zero', () => {
    expect(resolveFastBadgeTier(500, 0)).toBeNull();
  });

  it('returns null when solve speed is too slow', () => {
    const slow = fairMsPerLetter * 0.76 * 5;
    expect(resolveFastBadgeTier(slow, 5)).toBeNull();
  });

  it('scales total allowed time with word length at the same tier', () => {
    const msPerLetter = fairMsPerLetter * 0.5;
    expect(resolveFastBadgeTier(msPerLetter * 3, 3)).toBe(1);
    expect(resolveFastBadgeTier(msPerLetter * 8, 8)).toBe(1);
  });

  it('assigns two speed tiers by absolute ms per letter', () => {
    expect(resolveFastBadgeTier(fairMsPerLetter * 0.67 * 4, 4)).toBe(1);
    expect(resolveFastBadgeTier(fairMsPerLetter * 0.47 * 4, 4)).toBe(2);
  });
});

describe('resolveRareBadgeTier', () => {
  it('returns null below the rare threshold', () => {
    expect(resolveRareBadgeTier(1.1)).toBeNull();
    expect(resolveRareBadgeTier(1.2)).toBeNull();
  });

  it('assigns two rarity tiers', () => {
    expect(resolveRareBadgeTier(1.25)).toBe(1);
    expect(resolveRareBadgeTier(1.42)).toBe(2);
  });
});

describe('parseBadgeCounts', () => {
  it('folds legacy four-tier keys into two tiers', () => {
    expect(
      parseBadgeCounts({
        fast_1: 2,
        fast_2: 3,
        fast_3: 1,
        fast_4: 4,
        rare_1: 1,
        rare_2: 2,
        rare_3: 3,
        rare_4: 1,
        double: 5,
      }),
    ).toEqual({
      fast_1: 5,
      fast_2: 5,
      rare_1: 3,
      rare_2: 4,
      double: 5,
    });
  });
});
