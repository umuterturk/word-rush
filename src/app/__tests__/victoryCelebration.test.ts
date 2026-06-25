import { describe, expect, it } from 'vitest';
import { LEADERBOARD_TOP_COUNT } from '../../domain/constants';
import {
  brokeLocalRecord,
  devLeaderboardPreviewScore,
  devVictoryPreviewScore,
  getVictoryHonorMessage,
  isEpicVictoryCelebration,
  resolveVictoryHonorFocus,
  wouldQualifyForLeaderboard,
} from '../victoryCelebration';

function makeLeaderboard(scores: number[]) {
  return scores.map((score, i) => ({ name: `P${i + 1}`, score }));
}

const partialBoard = makeLeaderboard([30, 20, 10]);
const fullBoard = makeLeaderboard([100, 90, 80, 70, 60, 50, 40, 30, 20, 10]);

describe('victoryCelebration', () => {
  it('detects a new local record', () => {
    expect(brokeLocalRecord(12, 10)).toBe(true);
    expect(brokeLocalRecord(10, 10)).toBe(false);
    expect(brokeLocalRecord(0, 0)).toBe(false);
  });

  it(`detects leaderboard qualification against top ${LEADERBOARD_TOP_COUNT}`, () => {
    expect(wouldQualifyForLeaderboard(10, fullBoard)).toBe(true);
    expect(wouldQualifyForLeaderboard(9, fullBoard)).toBe(false);
    expect(wouldQualifyForLeaderboard(5, partialBoard)).toBe(true);
    expect(wouldQualifyForLeaderboard(5, [])).toBe(true);
  });

  it('builds a dev preview score that beats personal best and the leaderboard cutoff', () => {
    expect(devVictoryPreviewScore(50, partialBoard)).toBe(128);
    expect(devVictoryPreviewScore(200, fullBoard)).toBe(242);
  });

  it('builds a leaderboard-only dev preview below a high personal best', () => {
    expect(devLeaderboardPreviewScore(500, fullBoard)).toBe(25);
    expect(brokeLocalRecord(25, 500)).toBe(false);
    expect(wouldQualifyForLeaderboard(25, fullBoard)).toBe(true);
  });

  it('picks honor copy by preview focus', () => {
    const copy = {
      newBestHonor: 'Record {prev} -> {score}',
      newBestHonorFirst: 'First {score}',
      leaderboardHonor: 'Top ten',
      epicHonorBoth: 'Both',
    };
    expect(
      getVictoryHonorMessage(copy, true, true, 128, 50, resolveVictoryHonorFocus(true, false)),
    ).toBe('Record 50 -> 128');
    expect(
      getVictoryHonorMessage(copy, true, true, 25, 500, resolveVictoryHonorFocus(false, true)),
    ).toBe('Top ten');
    expect(getVictoryHonorMessage(copy, true, true, 128, 50, 'both')).toBe('Both');
  });

  it('uses epic celebration for records and leaderboard scores', () => {
    expect(isEpicVictoryCelebration(15, 5, fullBoard)).toBe(true);
    expect(isEpicVictoryCelebration(6, 8, fullBoard)).toBe(false);
    expect(isEpicVictoryCelebration(3, 5, fullBoard, true)).toBe(true);
  });
});
