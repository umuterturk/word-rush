import { describe, expect, it } from 'vitest';
import { EMPTY_BADGE_COUNTS } from '../../domain/badges';
import {
  earnedBadgesForHome,
  earnedTitlesForHome,
  floatBadgePosition,
  gameplayBadgesForHome,
  highestMilestoneInTrack,
  MP_GAMES_MILESTONE_TRACK,
} from '../homeBadgeDisplay';

describe('homeBadgeDisplay', () => {
  it('shows only the highest milestone per track', () => {
    const counts = {
      ...EMPTY_BADGE_COUNTS,
      mp_debut: 1,
      mp_sparring: 1,
      mp_legend: 1,
    };
    expect(highestMilestoneInTrack(MP_GAMES_MILESTONE_TRACK, counts)).toBe('mp_legend');
  });

  it('returns only earned titles', () => {
    const counts = {
      ...EMPTY_BADGE_COUNTS,
      solo_grinder: 1,
      mp_champion: 1,
    };
    expect(earnedTitlesForHome(counts)).toEqual(['solo_grinder', 'mp_champion']);
  });

  it('lists only gameplay badges with counts', () => {
    const counts = {
      ...EMPTY_BADGE_COUNTS,
      fast_1: 4,
      streak_3: 2,
      mp_debut: 1,
    };
    expect(gameplayBadgesForHome(counts)).toEqual([
      { id: 'fast_1', count: 4 },
      { id: 'streak_3', count: 2 },
    ]);
  });

  it('merges earned titles and skills for the home float shelf', () => {
    const counts = {
      ...EMPTY_BADGE_COUNTS,
      mp_legend: 1,
      fast_2: 3,
    };
    expect(earnedBadgesForHome(counts)).toEqual([
      { kind: 'title', id: 'mp_legend' },
      { kind: 'skill', id: 'fast_2', count: 3 },
    ]);
  });

  it('assigns scatter positions for floating icons', () => {
    const a = floatBadgePosition(0, 4);
    const b = floatBadgePosition(1, 4);
    expect(a.x).not.toBe(b.x);
    expect(a.x).toBeGreaterThan(0);
    expect(a.y).toBeGreaterThan(0);
  });
});
