import type { MatchSnapshot } from '../multiplayer/types';
import type { MultiplayerPort } from '../ports';

export class NoopMultiplayerAdapter implements MultiplayerPort {
  setDisplayName(_name: string): void {}

  async createRoom(): Promise<string> {
    throw new Error('Multiplayer is not available.');
  }

  async joinRoom(_code: string): Promise<void> {
    throw new Error('Multiplayer is not available.');
  }

  async cancel(): Promise<void> {}

  subscribe(_handler: (snapshot: MatchSnapshot | null) => void): () => void {
    return () => {};
  }

  async publishScore(_score: number): Promise<void> {}

  async markDone(_finalScore: number): Promise<void> {}

  async sendShuffle(): Promise<void> {}

  async requestRematch(): Promise<void> {}

  async rejoinMatch(_matchId: string): Promise<void> {}

  async leave(_forfeit?: boolean): Promise<void> {}

  getActiveMatchId(): string | null {
    return null;
  }
}
