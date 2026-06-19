import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  ensureAnonymousAuth,
  getFirebaseDb,
  WORD_REPORTS_COLLECTION,
} from '../firebase/config';
import type { WordReportPort } from '../ports';

function wordReportsEnabled(): boolean {
  if (!import.meta.env.DEV) return true;
  return import.meta.env.VITE_ENABLE_WORD_REPORTS === 'true';
}

export class FirebaseWordReportAdapter implements WordReportPort {
  async reportWord(word: string, language: 'tr' | 'en'): Promise<void> {
    if (!wordReportsEnabled()) return;

    const uid = await ensureAnonymousAuth();
    const db = getFirebaseDb();
    await addDoc(collection(db, WORD_REPORTS_COLLECTION), {
      word,
      language,
      uid,
      createdAt: serverTimestamp(),
    });
  }
}
