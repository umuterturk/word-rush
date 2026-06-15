import type { LeaderboardEntry, LeaderboardPort } from '../ports';

export class NoopLeaderboardAdapter implements LeaderboardPort {
  async submitScore(_name: string, _score: number): Promise<void> {}

  async fetchTop(_limit: number): Promise<LeaderboardEntry[]> {
    return [];
  }
}
