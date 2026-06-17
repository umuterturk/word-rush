import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ensureAnonymousAuth,
  getFirebaseDb,
  LEADERBOARD_COLLECTION,
} from '../firebase/config';
import type { LeaderboardEntry, LeaderboardPort } from '../ports';

export class FirebaseLeaderboardAdapter implements LeaderboardPort {
  async submitScore(name: string, score: number): Promise<void> {
    if (import.meta.env.DEV) return;

    const uid = await ensureAnonymousAuth();
    const db = getFirebaseDb();
    await addDoc(collection(db, LEADERBOARD_COLLECTION), {
      name: name.trim(),
      score,
      uid,
      createdAt: serverTimestamp(),
    });
  }

  async fetchTop(limitCount: number): Promise<LeaderboardEntry[]> {
    const db = getFirebaseDb();
    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      orderBy('score', 'desc'),
      limit(limitCount),
    );
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        name: String(data.name ?? ''),
        score: Number(data.score) || 0,
      };
    });
  }
}
