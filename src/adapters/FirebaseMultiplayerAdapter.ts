import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { MATCH_DURATION_MS } from '../domain/constants';
import { ensureAnonymousAuth, getFirebaseDb, MATCHES_COLLECTION } from '../firebase/config';
import type { MatchDoc, MatchSnapshot } from '../multiplayer/types';
import type { MultiplayerPort } from '../ports';

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return code;
}

function generatePlayerName(uid: string): string {
  const suffix = uid.slice(-4).toUpperCase();
  return `Player ${suffix}`;
}

function parseSnapshot(matchId: string, data: MatchDoc, localUid: string): MatchSnapshot | null {
  const playerUids = Object.keys(data.players);
  console.log('[MP:parseSnapshot]', { matchId, status: data.status, playerUids, localUid, localPresent: playerUids.includes(localUid) });

  if (!playerUids.includes(localUid)) {
    console.warn('[MP:parseSnapshot] local uid NOT in players — returning null');
    return null;
  }

  const opponentUid = playerUids.find(uid => uid !== localUid);
  if (!opponentUid) {
    console.log('[MP:parseSnapshot] no opponent yet, returning solo snapshot');
    return {
      matchId,
      mode: data.mode,
      inviteCode: data.inviteCode,
      seed: data.seed,
      matchDuration: data.matchDuration,
      status: data.status,
      round: data.round ?? 1,
      opponentUid: '',
      opponentName: '',
      opponentScore: 0,
      opponentWantsRematch: false,
      incomingShuffleNonce: 0,
    };
  }

  const opponent = data.players[opponentUid];
  const result = {
    matchId,
    mode: data.mode,
    inviteCode: data.inviteCode,
    seed: data.seed,
    matchDuration: data.matchDuration,
    status: data.status,
    round: data.round ?? 1,
    opponentUid,
    opponentName: opponent.name,
    opponentScore: opponent.score,
    opponentWantsRematch: Boolean(data.rematchReady && data.rematchReady[opponentUid]),
    // An attack TARGETING us is one the opponent sent, i.e. keyed by their uid.
    incomingShuffleNonce: data.shuffleAttacks?.[opponentUid] ?? 0,
  };
  console.log('[MP:parseSnapshot] returning', result);
  return result;
}

export class FirebaseMultiplayerAdapter implements MultiplayerPort {
  private matchId: string | null = null;
  private localUid: string | null = null;
  private unsubscribe: (() => void) | null = null;
  private handler: ((snapshot: MatchSnapshot | null) => void) | null = null;

  private async getUid(): Promise<string> {
    if (!this.localUid) {
      this.localUid = await ensureAnonymousAuth();
    }
    return this.localUid;
  }

  private get matchRef() {
    if (!this.matchId) throw new Error('No active match.');
    return doc(getFirebaseDb(), MATCHES_COLLECTION, this.matchId);
  }

  private startListening(): void {
    this.stopListening();
    console.log('[MP:startListening] handler=', !!this.handler, 'matchId=', this.matchId, 'uid=', this.localUid);
    if (!this.handler || !this.matchId || !this.localUid) {
      console.warn('[MP:startListening] BAILED — missing handler, matchId, or uid');
      return;
    }

    const matchId = this.matchId;
    const localUid = this.localUid;
    const handler = this.handler;

    this.unsubscribe = onSnapshot(this.matchRef, snap => {
      console.log('[MP:onSnapshot] exists=', snap.exists(), 'matchId=', matchId);
      if (!snap.exists()) {
        // Document deleted — opponent left
        handler(null);
        return;
      }
      const parsed = parseSnapshot(matchId, snap.data() as MatchDoc, localUid);
      if (!parsed) {
        // Stale local-cache burst fired before our transaction write was reflected.
        // Our uid is not in the players map yet — ignore and wait for the next snapshot.
        console.log('[MP:onSnapshot] stale snapshot (uid not in players yet) — ignoring');
        return;
      }
      handler(parsed);
    });
  }

  private stopListening(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  subscribe(handler: (snapshot: MatchSnapshot | null) => void): () => void {
    console.log('[MP:subscribe] called, matchId=', this.matchId);
    this.handler = handler;
    this.startListening();
    return () => {
      console.log('[MP:subscribe] cleanup — unsubscribing');
      this.handler = null;
      this.stopListening();
    };
  }

  async quickMatch(): Promise<void> {
    const uid = await this.getUid();
    console.log('[MP:quickMatch] uid=', uid);
    const db = getFirebaseDb();

    const openQuery = query(
      collection(db, MATCHES_COLLECTION),
      where('status', '==', 'waiting'),
      where('mode', '==', 'quick'),
      limit(5),
    );
    const openMatches = await getDocs(openQuery);

    for (const candidate of openMatches.docs) {
      try {
        await runTransaction(db, async transaction => {
          const snap = await transaction.get(candidate.ref);
          if (!snap.exists()) throw new Error('gone');

          const data = snap.data() as MatchDoc;
          const playerCount = Object.keys(data.players).length;
          if (data.status !== 'waiting' || playerCount >= 2 || data.players[uid]) {
            throw new Error('unavailable');
          }

          const newCount = playerCount + 1;
          transaction.update(candidate.ref, {
            [`players.${uid}`]: {
              name: generatePlayerName(uid),
              score: 0,
              joinedAt: Date.now(),
            },
            status: newCount >= 2 ? 'ready' : 'waiting',
          });
        });

        this.matchId = candidate.id;
        console.log('[MP:quickMatch] joined existing match', candidate.id);
        this.startListening();
        return;
      } catch (e) {
        console.log('[MP:quickMatch] candidate unavailable:', e);
      }
    }

    console.log('[MP:quickMatch] no candidates, creating new match');
    const newRef = doc(collection(db, MATCHES_COLLECTION));
    await setDoc(newRef, {
      mode: 'quick',
      inviteCode: null,
      status: 'waiting',
      seed: String(Date.now()),
      matchDuration: MATCH_DURATION_MS,
      round: 1,
      createdBy: uid,
      createdAt: serverTimestamp(),
      players: {
        [uid]: {
          name: generatePlayerName(uid),
          score: 0,
          joinedAt: Date.now(),
        },
      },
    } satisfies Omit<MatchDoc, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });

    this.matchId = newRef.id;
    console.log('[MP:quickMatch] created new match', newRef.id);
    this.startListening();
  }

  async createRoom(): Promise<void> {
    const uid = await this.getUid();
    const db = getFirebaseDb();
    const newRef = doc(collection(db, MATCHES_COLLECTION));

    await setDoc(newRef, {
      mode: 'private',
      inviteCode: generateInviteCode(),
      status: 'waiting',
      seed: String(Date.now()),
      matchDuration: MATCH_DURATION_MS,
      round: 1,
      createdBy: uid,
      createdAt: serverTimestamp(),
      players: {
        [uid]: {
          name: generatePlayerName(uid),
          score: 0,
          joinedAt: Date.now(),
        },
      },
    } satisfies Omit<MatchDoc, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });

    this.matchId = newRef.id;
    this.startListening();
  }

  async joinRoom(code: string): Promise<void> {
    const uid = await this.getUid();
    const db = getFirebaseDb();
    const normalized = code.trim().toUpperCase();
    console.log('[MP:joinRoom] uid=', uid, 'code=', normalized);

    const roomQuery = query(
      collection(db, MATCHES_COLLECTION),
      where('inviteCode', '==', normalized),
      where('status', '==', 'waiting'),
      limit(1),
    );
    const rooms = await getDocs(roomQuery);
    console.log('[MP:joinRoom] query result empty=', rooms.empty, 'count=', rooms.size);
    if (rooms.empty) {
      throw new Error('Room not found or already started.');
    }

    const roomRef = rooms.docs[0].ref;

    await runTransaction(db, async transaction => {
      const snap = await transaction.get(roomRef);
      if (!snap.exists()) throw new Error('Room not found.');

      const data = snap.data() as MatchDoc;
      const playerCount = Object.keys(data.players).length;
      console.log('[MP:joinRoom] transaction read — status=', data.status, 'playerCount=', playerCount, 'alreadyIn=', !!data.players[uid]);
      if (data.status !== 'waiting' || playerCount >= 2) {
        throw new Error('Room is full or already started.');
      }
      if (data.players[uid]) {
        console.log('[MP:joinRoom] already in room, skipping write');
        return;
      }

      const newCount = playerCount + 1;
      const newStatus = newCount >= 2 ? 'ready' : 'waiting';
      console.log('[MP:joinRoom] writing player, newStatus=', newStatus);
      transaction.update(roomRef, {
        [`players.${uid}`]: {
          name: generatePlayerName(uid),
          score: 0,
          joinedAt: Date.now(),
        },
        status: newStatus,
      });
    });

    console.log('[MP:joinRoom] transaction done, matchId=', roomRef.id);
    this.matchId = roomRef.id;
    this.startListening();
  }

  async publishScore(score: number): Promise<void> {
    if (!this.matchId || !this.localUid) return;
    await updateDoc(this.matchRef, {
      [`players.${this.localUid}.score`]: score,
    });
  }

  async sendShuffle(): Promise<void> {
    if (!this.matchId || !this.localUid) return;
    // Key the attack by our own uid; the opponent reads the entry not keyed by them.
    await updateDoc(this.matchRef, {
      [`shuffleAttacks.${this.localUid}`]: Date.now(),
    });
  }

  async requestRematch(): Promise<void> {
    if (!this.matchId || !this.localUid) return;
    const uid = this.localUid;
    const ref = this.matchRef;
    const db = getFirebaseDb();

    await runTransaction(db, async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error('Match no longer exists.');

      const data = snap.data() as MatchDoc;
      const playerUids = Object.keys(data.players);
      const rematchReady = { ...(data.rematchReady ?? {}), [uid]: true };

      const bothReady =
        playerUids.length === 2 && playerUids.every(p => rematchReady[p]);

      if (bothReady) {
        // Both players agreed — reset the SAME match for a new round:
        // fresh seed, scores zeroed, status ready, round bumped, flags cleared.
        const update: Record<string, unknown> = {
          seed: String(Date.now()) + '-' + Math.floor(Math.random() * 1e6),
          status: 'ready',
          round: (data.round ?? 1) + 1,
          rematchReady: {},
          shuffleAttacks: {},
        };
        for (const p of playerUids) {
          update[`players.${p}.score`] = 0;
        }
        console.log('[MP:requestRematch] both ready — resetting match, new round=', update.round);
        transaction.update(ref, update);
      } else {
        console.log('[MP:requestRematch] marking self ready, waiting for opponent');
        transaction.update(ref, { rematchReady });
      }
    });
  }

  async cancel(): Promise<void> {
    await this.leave();
  }

  async leave(): Promise<void> {
    this.stopListening();

    if (!this.matchId || !this.localUid) {
      this.matchId = null;
      return;
    }

    const matchId = this.matchId;
    const uid = this.localUid;
    const ref = doc(getFirebaseDb(), MATCHES_COLLECTION, matchId);

    try {
      await runTransaction(getFirebaseDb(), async transaction => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) return;

        const data = snap.data() as MatchDoc;
        const players = { ...data.players };
        delete players[uid];

        const remaining = Object.keys(players).length;
        if (remaining === 0) {
          transaction.delete(ref);
        } else {
          transaction.update(ref, {
            players,
            status: data.status === 'ended' ? 'ended' : 'waiting',
          });
        }
      });
    } catch {
      // Best-effort cleanup
    }

    this.matchId = null;
  }
}
