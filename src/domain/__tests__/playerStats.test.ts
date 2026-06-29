import { describe, expect, it } from 'vitest';
import {
  EMPTY_PLAYER_STATS,
  resolveNewMilestoneBadges,
} from '../playerStats';

describe('resolveNewMilestoneBadges', () => {
  it('unlocks first rival on the first multiplayer game', () => {
    const before = { ...EMPTY_PLAYER_STATS };
    const after = { ...EMPTY_PLAYER_STATS, multiplayerGamesCompleted: 1 };
    expect(resolveNewMilestoneBadges(before, after)).toEqual(['mp_debut']);
  });

  it('unlocks multiple milestones when crossing several thresholds', () => {
    const before = { ...EMPTY_PLAYER_STATS, multiplayerGamesCompleted: 4 };
    const after = { ...EMPTY_PLAYER_STATS, multiplayerGamesCompleted: 10 };
    expect(resolveNewMilestoneBadges(before, after)).toEqual([
      'mp_sparring',
      'mp_arena',
    ]);
  });

  it('unlocks champion on first win', () => {
    const before = { ...EMPTY_PLAYER_STATS, multiplayerGamesCompleted: 3 };
    const after = {
      ...EMPTY_PLAYER_STATS,
      multiplayerGamesCompleted: 4,
      multiplayerWins: 1,
    };
    expect(resolveNewMilestoneBadges(before, after)).toContain('mp_champion');
  });
});
