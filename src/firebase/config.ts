import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

// These values are intentionally public — Firebase web config is always
// embedded in the client bundle. Security comes from Firebase's authorized
// domains list (only umuterturk.github.io and localhost are allowed to
// make auth requests).
const firebaseConfig = {
  apiKey: 'AIzaSyC0mWW-eKy1IxBvmpoO7zJcSW-roiTaPrI',
  authDomain: 'sum-rush-47b90.firebaseapp.com',
  projectId: 'sum-rush-47b90',
  storageBucket: 'sum-rush-47b90.firebasestorage.app',
  messagingSenderId: '169422614049',
  appId: '1:169422614049:web:e9d35cf8b3bb9228f4fd60',
  measurementId: 'G-B0FFDB5ETP',
};

/** Firestore collection for multiplayer matches (separate from sum-rush's `matches`). */
export const MATCHES_COLLECTION =
  import.meta.env.VITE_FIREBASE_MATCHES_COLLECTION ?? 'word-rush-matches';

export const LEADERBOARD_COLLECTION =
  import.meta.env.VITE_FIREBASE_LEADERBOARD_COLLECTION ?? 'word-rush-leaderboard';

export const WORD_REPORTS_COLLECTION =
  import.meta.env.VITE_FIREBASE_WORD_REPORTS_COLLECTION ?? 'word-rush-word-reports';

export function isFirebaseConfigured(): boolean {
  return true;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
let authReady: Promise<string> | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;
  if (!(await isSupported())) return null;
  analytics = getAnalytics(getFirebaseApp());
  return analytics;
}

/** Ensures anonymous auth and returns the stable uid. */
export async function ensureAnonymousAuth(): Promise<string> {
  if (!authReady) {
    authReady = (async () => {
      const firebaseAuth = getFirebaseAuth();
      if (!firebaseAuth.currentUser) {
        await signInAnonymously(firebaseAuth);
      }
      const uid = firebaseAuth.currentUser?.uid;
      if (!uid) throw new Error('Anonymous sign-in failed.');
      return uid;
    })();
  }
  return authReady;
}
