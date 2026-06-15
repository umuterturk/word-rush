import type { StoragePort } from '../ports';
import { parseSavedGameSession, type SavedGameSession } from '../domain/savedGameSession';

const BEST_SCORE_KEY = 'word-rush:bestScore';
const USERNAME_KEY = 'word-rush:username';
const ACTIVE_SESSION_KEY = 'word-rush:activeSession';

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

  async saveGameSession(session: SavedGameSession): Promise<void> {
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Silently ignore — storage may be unavailable
    }
  }

  async loadGameSession(): Promise<SavedGameSession | null> {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (raw === null) return null;
      return parseSavedGameSession(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async clearGameSession(): Promise<void> {
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      // Silently ignore — storage may be unavailable
    }
  }
}
