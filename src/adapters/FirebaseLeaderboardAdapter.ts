import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getDayStartUtc, getWeekStartMondayUtc } from '../domain/weekStart';
import {
  ensureAnonymousAuth,
  getFirebaseDb,
  LEADERBOARD_COLLECTION,
} from '../firebase/config';
import type { LeaderboardEntry, LeaderboardPeriod, LeaderboardPort } from '../ports';

const PERIOD_FETCH_LIMIT = 50;

function mapLeaderboardDoc(docSnap: { data: () => Record<string, unknown> }): LeaderboardEntry {
  const data = docSnap.data();
  return {
    name: String(data.name ?? ''),
    score: Number(data.score) || 0,
  };
}

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

  async fetchTop(
    limitCount: number,
    period: LeaderboardPeriod = 'all-time',
  ): Promise<LeaderboardEntry[]> {
    const db = getFirebaseDb();

    if (period === 'all-time') {
      const q = query(
        collection(db, LEADERBOARD_COLLECTION),
        orderBy('score', 'desc'),
        limit(limitCount),
      );
      const snap = await getDocs(q);
      return snap.docs.map(mapLeaderboardDoc);
    }

    const periodStart =
      period === 'today' ? getDayStartUtc() : getWeekStartMondayUtc();
    const q = query(
      collection(db, LEADERBOARD_COLLECTION),
      where('createdAt', '>=', Timestamp.fromDate(periodStart)),
      orderBy('createdAt', 'desc'),
      limit(PERIOD_FETCH_LIMIT),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(mapLeaderboardDoc)
      .sort((a, b) => b.score - a.score)
      .slice(0, limitCount);
  }
}
