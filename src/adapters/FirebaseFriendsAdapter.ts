import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { friendRivalPairId, orderedUids } from '../friends/pairId';
import type {
  FriendDoc,
  FriendRivalDoc,
  GameRequestDoc,
  UserProfileDoc,
} from '../friends/types';
import {
  ensureAnonymousAuth,
  FRIEND_RIVALS_COLLECTION,
  GAME_REQUESTS_COLLECTION,
  GAME_REQUEST_TTL_MS,
  getFirebaseDb,
  USERS_COLLECTION,
} from '../firebase/config';
import type { FriendEntry, FriendsPort, GameRequest } from '../ports';

function timestampToMs(value: unknown): number | undefined {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === 'number') return value;
  return undefined;
}

function parseGameRequest(id: string, data: GameRequestDoc): GameRequest | null {
  const createdAt = timestampToMs(data.createdAt) ?? 0;
  const expiresAt = timestampToMs(data.expiresAt) ?? createdAt + GAME_REQUEST_TTL_MS;
  if (Date.now() > expiresAt) return null;
  if (data.status !== 'pending') return null;

  return {
    id,
    fromUid: data.fromUid,
    fromName: data.fromName,
    toUid: data.toUid,
    matchId: data.matchId,
    inviteCode: data.inviteCode,
    status: data.status,
    createdAt,
  };
}

export class FirebaseFriendsAdapter implements FriendsPort {
  private localUid: string | null = null;
  private displayName = '';
  private requestUnsubscribe: (() => void) | null = null;

  private async getUid(): Promise<string> {
    if (!this.localUid) {
      this.localUid = await ensureAnonymousAuth();
    }
    return this.localUid;
  }

  private userRef(uid: string) {
    return doc(getFirebaseDb(), USERS_COLLECTION, uid);
  }

  private friendRef(uid: string, friendUid: string) {
    return doc(getFirebaseDb(), USERS_COLLECTION, uid, 'friends', friendUid);
  }

  private fallbackName(uid: string): string {
    return `Player ${uid.slice(-4).toUpperCase()}`;
  }

  /** Prefer the friend's live profile name over a stale match snapshot. */
  private async resolveDisplayName(uid: string, fallback?: string): Promise<string> {
    const profileSnap = await getDoc(this.userRef(uid));
    if (profileSnap.exists()) {
      const profileName = (profileSnap.data() as UserProfileDoc).displayName?.trim();
      if (profileName) return profileName;
    }
    const trimmed = fallback?.trim();
    if (trimmed) return trimmed;
    return this.fallbackName(uid);
  }

  async syncProfile(displayName: string): Promise<void> {
    const uid = await this.getUid();
    this.displayName = displayName.trim();
    await setDoc(
      this.userRef(uid),
      {
        displayName: this.displayName || `Player ${uid.slice(-4).toUpperCase()}`,
        updatedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        inMatch: false,
      },
      { merge: true },
    );
  }

  async setPresence(inMatch: boolean, matchId?: string): Promise<void> {
    const uid = await this.getUid();
    const update: Record<string, unknown> = {
      lastSeenAt: serverTimestamp(),
      inMatch,
      currentMatchId: inMatch && matchId ? matchId : null,
    };
    await setDoc(this.userRef(uid), update, { merge: true });
  }

  async listFriends(): Promise<FriendEntry[]> {
    const uid = await this.getUid();
    const friendsSnap = await getDocs(collection(getFirebaseDb(), USERS_COLLECTION, uid, 'friends'));

    const entries = await Promise.all(
      friendsSnap.docs.map(async friendDoc => {
        const friendUid = friendDoc.id;
        const friendData = friendDoc.data() as FriendDoc;
        const pairId = friendRivalPairId(uid, friendUid);
        const [rivalSnap, displayName] = await Promise.all([
          getDoc(doc(getFirebaseDb(), FRIEND_RIVALS_COLLECTION, pairId)),
          this.resolveDisplayName(friendUid, friendData.displayName),
        ]);

        let wins = 0;
        let losses = 0;
        let ties = 0;

        if (rivalSnap.exists()) {
          const rival = rivalSnap.data() as FriendRivalDoc;
          wins = rival.wins[uid] ?? 0;
          const oppWins = rival.wins[friendUid] ?? 0;
          losses = oppWins;
          ties = rival.ties ?? 0;
        }

        if (displayName !== friendData.displayName) {
          void setDoc(this.friendRef(uid, friendUid), { displayName }, { merge: true });
        }

        return {
          uid: friendUid,
          displayName,
          wins,
          losses,
          ties,
          lastPlayedAt: timestampToMs(friendData.lastPlayedAt),
        };
      }),
    );

    entries.sort((a, b) => {
      const aTime = a.lastPlayedAt ?? 0;
      const bTime = b.lastPlayedAt ?? 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.displayName.localeCompare(b.displayName);
    });

    return entries;
  }

  async addFriend(friendUid: string, friendDisplayName: string): Promise<void> {
    const uid = await this.getUid();
    if (uid === friendUid) return;

    const remoteName = await this.resolveDisplayName(friendUid, friendDisplayName);

    await setDoc(
      this.friendRef(uid, friendUid),
      {
        displayName: remoteName,
        addedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async isFriend(friendUid: string): Promise<boolean> {
    const uid = await this.getUid();
    const snap = await getDoc(this.friendRef(uid, friendUid));
    return snap.exists();
  }

  async recordMatchResult(
    opponentUid: string,
    opponentName: string,
    result: 'win' | 'lose' | 'tie',
    matchId?: string,
  ): Promise<void> {
    const uid = await this.getUid();
    if (uid === opponentUid) return;

    const isFriend = await this.isFriend(opponentUid);
    if (!isFriend) return;

    const resolvedName = await this.resolveDisplayName(opponentUid, opponentName);
    const pairId = friendRivalPairId(uid, opponentUid);
    const [uidA, uidB] = orderedUids(uid, opponentUid);
    const rivalRef = doc(getFirebaseDb(), FRIEND_RIVALS_COLLECTION, pairId);
    const now = serverTimestamp();

    await runTransaction(getFirebaseDb(), async tx => {
      const snap = await tx.get(rivalRef);
      const wins: Record<string, number> = snap.exists()
        ? { ...(snap.data() as FriendRivalDoc).wins }
        : { [uidA]: 0, [uidB]: 0 };
      let ties = snap.exists() ? ((snap.data() as FriendRivalDoc).ties ?? 0) : 0;

      if (result === 'tie') {
        ties += 1;
      } else if (result === 'win') {
        wins[uid] = (wins[uid] ?? 0) + 1;
      } else {
        wins[opponentUid] = (wins[opponentUid] ?? 0) + 1;
      }

      tx.set(
        rivalRef,
        {
          uids: [uidA, uidB],
          wins,
          ties,
          lastMatchAt: now,
          ...(matchId ? { lastMatchId: matchId } : {}),
        },
        { merge: true },
      );

      tx.set(
        this.friendRef(uid, opponentUid),
        { displayName: resolvedName, lastPlayedAt: now },
        { merge: true },
      );
    }).catch(err => {
      console.warn('[Friends] recordMatchResult failed:', err);
    });
  }

  async sendGameRequest(
    toUid: string,
    matchId: string,
    inviteCode: string,
  ): Promise<GameRequest> {
    const fromUid = await this.getUid();
    const fromName =
      this.displayName.trim() || `Player ${fromUid.slice(-4).toUpperCase()}`;
    const expiresAt = Timestamp.fromMillis(Date.now() + GAME_REQUEST_TTL_MS);

    const ref = doc(collection(getFirebaseDb(), GAME_REQUESTS_COLLECTION));
    await setDoc(ref, {
      fromUid,
      fromName,
      toUid,
      matchId,
      inviteCode,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt,
    } satisfies Omit<GameRequestDoc, 'createdAt' | 'expiresAt'> & {
      createdAt: ReturnType<typeof serverTimestamp>;
      expiresAt: Timestamp;
    });

    return {
      id: ref.id,
      fromUid,
      fromName,
      toUid,
      matchId,
      inviteCode,
      status: 'pending',
      createdAt: Date.now(),
    };
  }

  subscribeIncomingRequests(handler: (request: GameRequest | null) => void): () => void {
    let active = true;

    void this.getUid().then(uid => {
      if (!active) return;

      const q = query(
        collection(getFirebaseDb(), GAME_REQUESTS_COLLECTION),
        where('toUid', '==', uid),
        where('status', '==', 'pending'),
        limit(10),
      );

      this.requestUnsubscribe = onSnapshot(
        q,
        snap => {
          if (snap.empty) {
            handler(null);
            return;
          }
          const pending = snap.docs
            .map(docSnap => parseGameRequest(docSnap.id, docSnap.data() as GameRequestDoc))
            .filter((req): req is GameRequest => req !== null)
            .sort((a, b) => b.createdAt - a.createdAt);
          handler(pending[0] ?? null);
        },
        err => {
          console.warn('[Friends] incoming request listener:', err);
          handler(null);
        },
      );
    });

    return () => {
      active = false;
      this.requestUnsubscribe?.();
      this.requestUnsubscribe = null;
    };
  }

  async acceptGameRequest(requestId: string): Promise<void> {
    await updateDoc(doc(getFirebaseDb(), GAME_REQUESTS_COLLECTION, requestId), {
      status: 'accepted',
    });
  }

  async declineGameRequest(requestId: string): Promise<void> {
    await updateDoc(doc(getFirebaseDb(), GAME_REQUESTS_COLLECTION, requestId), {
      status: 'declined',
    });
  }

  async cancelOutgoingRequest(requestId: string): Promise<void> {
    await updateDoc(doc(getFirebaseDb(), GAME_REQUESTS_COLLECTION, requestId), {
      status: 'expired',
    });
  }
}
