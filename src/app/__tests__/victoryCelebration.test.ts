import { describe, expect, it } from 'vitest';
import {
  brokeLocalRecord,
  devLeaderboardPreviewScore,
  devVictoryPreviewScore,
  getVictoryHonorMessage,
  isEpicVictoryCelebration,
  resolveVictoryHonorFocus,
  wouldQualifyForLeaderboard,
} from '../victoryCelebration';

describe('victoryCelebration', () => {
  it('detects a new local record', () => {
    expect(brokeLocalRecord(12, 10)).toBe(true);
    expect(brokeLocalRecord(10, 10)).toBe(false);
    expect(brokeLocalRecord(0, 0)).toBe(false);
  });

  it('detects leaderboard qualification against top 3', () => {
    const top3 = [
      { name: 'A', score: 30 },
      { name: 'B', score: 20 },
      { name: 'C', score: 10 },
    ];
    expect(wouldQualifyForLeaderboard(10, top3)).toBe(true);
    expect(wouldQualifyForLeaderboard(9, top3)).toBe(false);
    expect(wouldQualifyForLeaderboard(5, [])).toBe(true);
  });

  it('builds a dev preview score that beats personal best and top 3', () => {
    const top3 = [
      { name: 'A', score: 30 },
      { name: 'B', score: 20 },
      { name: 'C', score: 10 },
    ];
    expect(devVictoryPreviewScore(50, top3)).toBe(128);
    expect(devVictoryPreviewScore(200, top3)).toBe(242);
  });

  it('builds a leaderboard-only dev preview below a high personal best', () => {
    const top3 = [
      { name: 'A', score: 30 },
      { name: 'B', score: 20 },
      { name: 'C', score: 10 },
    ];
    expect(devLeaderboardPreviewScore(500, top3)).toBe(25);
    expect(brokeLocalRecord(25, 500)).toBe(false);
    expect(wouldQualifyForLeaderboard(25, top3)).toBe(true);
  });

  it('picks honor copy by preview focus', () => {
    const copy = {
      newBestHonor: 'Record {prev} -> {score}',
      newBestHonorFirst: 'First {score}',
      leaderboardHonor: 'Top three',
      epicHonorBoth: 'Both',
    };
    expect(
      getVictoryHonorMessage(copy, true, true, 128, 50, resolveVictoryHonorFocus(true, false)),
    ).toBe('Record 50 -> 128');
    expect(
      getVictoryHonorMessage(copy, true, true, 25, 500, resolveVictoryHonorFocus(false, true)),
    ).toBe('Top three');
    expect(getVictoryHonorMessage(copy, true, true, 128, 50, 'both')).toBe('Both');
  });

  it('uses epic celebration for records and leaderboard scores', () => {
    const board = [
      { name: 'A', score: 30 },
      { name: 'B', score: 20 },
      { name: 'C', score: 10 },
    ];
    expect(isEpicVictoryCelebration(15, 5, board)).toBe(true);
    expect(isEpicVictoryCelebration(6, 8, board)).toBe(false);
    expect(isEpicVictoryCelebration(3, 5, board, true)).toBe(true);
  });
});
