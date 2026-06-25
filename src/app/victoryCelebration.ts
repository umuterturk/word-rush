import type { LeaderboardEntry } from '../ports';
import { LEADERBOARD_TOP_COUNT } from '../domain/constants';

export const SOLO_VICTORY_WAIT_MS = 300;
export const CELEBRATION_EXTRA_MS = 500;
export const CELEBRATION_STAGGER_MS = 62;
export const CELEBRATION_POPUP_DELAY_MS = 900 + CELEBRATION_EXTRA_MS;
export const CELEBRATION_TILE_POP_MS = 720 + CELEBRATION_EXTRA_MS;
export const VICTORY_POPUP_ACTION_DELAY_MS = 500;

export function brokeLocalRecord(score: number, previousBest: number): boolean {
  return score > 0 && score > previousBest;
}

/** True when the score would place on the current leaderboard. */
export function wouldQualifyForLeaderboard(score: number, entries: LeaderboardEntry[]): boolean {
  if (score <= 0) return false;
  if (entries.length < LEADERBOARD_TOP_COUNT) return true;
  return score >= entries[entries.length - 1].score;
}

export function isEpicVictoryCelebration(
  score: number,
  previousBest: number,
  leaderboardEntries: LeaderboardEntry[],
  forceEpic = false,
): boolean {
  if (forceEpic) return true;
  return brokeLocalRecord(score, previousBest) || wouldQualifyForLeaderboard(score, leaderboardEntries);
}

/** Dev preview: high enough to beat personal best and the leaderboard cutoff when the real score is 0. */
export function devVictoryPreviewScore(
  storedBest: number,
  leaderboardEntries: LeaderboardEntry[],
): number {
  const beatStoredBest = Math.max(storedBest + 42, 128);
  if (leaderboardEntries.length >= LEADERBOARD_TOP_COUNT) {
    const cutoff = leaderboardEntries[leaderboardEntries.length - 1].score;
    return Math.max(beatStoredBest, cutoff + 15);
  }
  return beatStoredBest;
}

/** Dev preview: leaderboard-qualifying score that may stay below a high personal best. */
export function devLeaderboardPreviewScore(
  storedBest: number,
  leaderboardEntries: LeaderboardEntry[],
): number {
  if (leaderboardEntries.length >= LEADERBOARD_TOP_COUNT) {
    const cutoff = leaderboardEntries[leaderboardEntries.length - 1].score;
    return cutoff + 15;
  }
  return Math.max(128, storedBest > 0 ? storedBest - 1 : 128);
}

export type VictoryHonorFocus = 'both' | 'record' | 'leaderboard';

export function resolveVictoryHonorFocus(forceRecord: boolean, forceEpic: boolean): VictoryHonorFocus {
  if (forceRecord && !forceEpic) return 'record';
  if (forceEpic && !forceRecord) return 'leaderboard';
  return 'both';
}

interface VictoryHonorStrings {
  newBestHonor: string;
  newBestHonorFirst: string;
  leaderboardHonor: string;
  epicHonorBoth: string;
}

export function getVictoryHonorMessage(
  t: VictoryHonorStrings,
  isNewBest: boolean,
  qualifiesForLeaderboard: boolean,
  score: number,
  previousBest: number,
  focus: VictoryHonorFocus = 'both',
): string | null {
  const showRecord = isNewBest && (focus === 'record' || focus === 'both');
  const showLeaderboard =
    qualifiesForLeaderboard && (focus === 'leaderboard' || focus === 'both');

  if (showRecord && showLeaderboard && focus === 'both') {
    return t.epicHonorBoth;
  }
  if (showRecord) {
    if (previousBest <= 0) {
      return t.newBestHonorFirst.replace('{score}', String(score));
    }
    return t.newBestHonor
      .replace('{prev}', String(previousBest))
      .replace('{score}', String(score));
  }
  if (showLeaderboard) {
    return t.leaderboardHonor;
  }
  return null;
}

export function getVictoryEpicBadgeLabel(
  labels: { newBest: string; leaderboard: string },
  isNewBest: boolean,
  qualifiesForLeaderboard: boolean,
  focus: VictoryHonorFocus = 'both',
): string | null {
  if (focus === 'record') {
    return isNewBest ? labels.newBest : null;
  }
  if (focus === 'leaderboard') {
    return qualifiesForLeaderboard ? labels.leaderboard : null;
  }
  if (isNewBest && qualifiesForLeaderboard) {
    return `${labels.newBest} · ${labels.leaderboard}`;
  }
  if (isNewBest) return labels.newBest;
  if (qualifiesForLeaderboard) return labels.leaderboard;
  return null;
}
