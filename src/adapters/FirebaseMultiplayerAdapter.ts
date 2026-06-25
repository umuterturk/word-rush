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
import { MULTIPLAYER_MATCH_DURATION_MS } from '../domain/constants';
import { ensureAnonymousAuth, getFirebaseDb, MATCHES_COLLECTION } from '../firebase/config';
import type { MatchDoc, MatchSnapshot } from '../multiplayer/types';
import type { MultiplayerPort } from '../ports';

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** How often each client refreshes its lastSeen heartbeat while in a match. */
const HEARTBEAT_INTERVAL_MS = 12_000;
/**
 * A `waiting` room whose only player hasn't refreshed within this window is
 * treated as abandoned (creator closed the tab) and skipped/cleaned up — this
 * is the serverless substitute for a presence check, so joiners aren't trapped
 * waiting for an opponent who will never appear.
 */
const ROOM_STALE_MS = 40_000;

/** True when a waiting room's participants all went silent past the stale window. */
function isWaitingRoomStale(data: MatchDoc, now: number): boolean {
  if (data.status !== 'waiting') return false;
  const players = Object.values(data.players);
  if (players.length === 0) return true;
  return players.every(p => (p.lastSeen ?? p.joinedAt) < now - ROOM_STALE_MS);
}

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
      opponentResigned: false,
      opponentDone: false,
      opponentLeft: false,
      incomingShuffleNonce: 0,
    };
  }

  const opponent = data.players[opponentUid];
  const opponentResigned = Boolean(opponent.resigned);
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
    opponentResigned,
    opponentDone: Boolean(opponent.done),
    opponentLeft: Boolean(opponent.left),
    // An attack TARGETING us is one the opponent sent, i.e. keyed by their uid.
    incomingShuffleNonce: data.shuffleAttacks?.[opponentUid] ?? 0,
  };
  console.log('[MP:parseSnapshot] returning', result);
  return result;
}

export class FirebaseMultiplayerAdapter implements MultiplayerPort {
  private matchId: string | null = null;
  private localUid: string | null = null;
  private displayName = '';
  private unsubscribe: (() => void) | null = null;
  private handler: ((snapshot: MatchSnapshot | null) => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  setDisplayName(name: string): void {
    this.displayName = name.trim();
  }

  private playerName(uid: string): string {
    return this.displayName || generatePlayerName(uid);
  }

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

  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (!this.matchId || !this.localUid) return;
    const ping = () => void this.heartbeat();
    ping();
    this.heartbeatTimer = setInterval(ping, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async heartbeat(): Promise<void> {
    if (!this.matchId || !this.localUid) return;
    try {
      await updateDoc(this.matchRef, {
        [`players.${this.localUid}.lastSeen`]: Date.now(),
      });
    } catch {
      // Doc may be gone (match cleaned up) — let the snapshot handler react.
    }
  }

  private startListening(): void {
    this.stopListening();
    console.log('[MP:startListening] handler=', !!this.handler, 'matchId=', this.matchId, 'uid=', this.localUid);
    if (!this.matchId || !this.localUid) {
      console.warn('[MP:startListening] BAILED — missing matchId or uid');
      return;
    }

    // Heartbeat runs whenever we hold an active match, even before React wires
    // up the snapshot handler, so a just-created room is immediately "alive".
    this.startHeartbeat();

    if (!this.handler) {
      console.warn('[MP:startListening] no handler yet — heartbeat only');
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
    this.stopHeartbeat();
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

  async createRoom(): Promise<string> {
    const uid = await this.getUid();
    const db = getFirebaseDb();
    const newRef = doc(collection(db, MATCHES_COLLECTION));
    const inviteCode = generateInviteCode();

    await setDoc(newRef, {
      mode: 'private',
      inviteCode,
      status: 'waiting',
      seed: String(Date.now()),
      matchDuration: MULTIPLAYER_MATCH_DURATION_MS,
      round: 1,
      createdBy: uid,
      createdAt: serverTimestamp(),
      players: {
        [uid]: {
          name: this.playerName(uid),
          score: 0,
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        },
      },
    } satisfies Omit<MatchDoc, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });

    this.matchId = newRef.id;
    this.startListening();
    return inviteCode;
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
      if (isWaitingRoomStale(data, Date.now())) {
        // Creator abandoned the room — clean it up and report it as gone so the
        // joiner sees "unavailable" instead of waiting forever for a no-show.
        transaction.delete(roomRef);
        throw new Error('Room not found or already started.');
      }

      const newCount = playerCount + 1;
      const newStatus = newCount >= 2 ? 'ready' : 'waiting';
      console.log('[MP:joinRoom] writing player, newStatus=', newStatus);
      transaction.update(roomRef, {
        [`players.${uid}`]: {
          name: this.playerName(uid),
          score: 0,
          joinedAt: Date.now(),
          lastSeen: Date.now(),
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
    try {
      await updateDoc(this.matchRef, {
        [`players.${this.localUid}.score`]: score,
      });
    } catch {
      // The match doc may have been deleted (opponent left) — ignore.
    }
  }

  /**
   * Publish the final score and mark this player done. The opponent only
   * resolves the match result once both players are done, so end times can
   * differ between clients without producing inconsistent win/loss outcomes.
   */
  async markDone(finalScore: number): Promise<void> {
    if (!this.matchId || !this.localUid) return;
    try {
      await updateDoc(this.matchRef, {
        [`players.${this.localUid}.score`]: finalScore,
        [`players.${this.localUid}.done`]: true,
      });
    } catch {
      // The match doc may have been deleted (opponent left) — ignore.
    }
  }

  async sendShuffle(): Promise<void> {
    if (!this.matchId || !this.localUid) return;
    // Key the attack by our own uid; the opponent reads the entry not keyed by them.
    try {
      await updateDoc(this.matchRef, {
        [`shuffleAttacks.${this.localUid}`]: Date.now(),
      });
    } catch {
      // The match doc may have been deleted (opponent left) — ignore.
    }
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

  async rejoinMatch(matchId: string): Promise<void> {
    await this.getUid();
    this.matchId = matchId;
    this.startListening();
  }

  async leave(forfeit = false): Promise<void> {
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
        const playerCount = Object.keys(players).length;

        if (forfeit && playerCount === 2 && data.status !== 'ended') {
          // Forfeit: keep the player entry so their final score stays visible.
          players[uid] = { ...players[uid], resigned: true };
          transaction.update(ref, {
            players,
            status: 'ended',
            resignedBy: uid,
          });
          return;
        }

        if (data.status === 'ended' && players[uid]) {
          // Leaving an already-ended match: keep our score entry so the
          // opponent's result stays correct. Mark ourselves as left; only
          // delete the doc once both players have left.
          players[uid] = { ...players[uid], left: true };
          const allLeft = Object.values(players).every(p => p.left);
          if (allLeft) {
            transaction.delete(ref);
          } else {
            transaction.update(ref, { players });
          }
          return;
        }

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

  getActiveMatchId(): string | null {
    return this.matchId;
  }
}
