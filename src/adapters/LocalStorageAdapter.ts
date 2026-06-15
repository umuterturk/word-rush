import type { StoragePort } from '../ports';

const BEST_SCORE_KEY = 'word-rush:bestScore';
const USERNAME_KEY = 'word-rush:username';

export class LocalStorageAdapter implements StoragePort {
  async saveBestScore(score: number): Promise<void> {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch {
      // Silently ignore — storage may be unavailable (private browsing, quota)
    }
  }

  async loadBestScore(): Promise<number> {
    try {
      const raw = localStorage.getItem(BEST_SCORE_KEY);
      if (raw === null) return 0;
      const n = parseInt(raw, 10);
      return isNaN(n) ? 0 : Math.max(0, n);
    } catch {
      return 0;
    }
  }

  async saveUsername(name: string): Promise<void> {
    try {
      localStorage.setItem(USERNAME_KEY, name.trim());
    } catch {
      // Silently ignore — storage may be unavailable
    }
  }

  async loadUsername(): Promise<string> {
    try {
      return localStorage.getItem(USERNAME_KEY)?.trim() ?? '';
    } catch {
      return '';
    }
  }
}
