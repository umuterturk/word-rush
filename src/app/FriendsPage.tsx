import type { FriendEntry } from '../ports';
import { useI18n } from '../i18n';

interface Props {
  friends: FriendEntry[];
  loading: boolean;
  challengingUid: string | null;
  onChallenge: (friend: FriendEntry) => void;
  onPlayWithFriend: () => void;
}

export function FriendsPage({
  friends,
  loading,
  challengingUid,
  onChallenge,
  onPlayWithFriend,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="start-friends-page">
      <h2 className="start-page-title">{t.navFriends}</h2>
      <p className="friends-hint">{t.friendsHint}</p>

      {loading ? (
        <div className="leaderboard-empty">…</div>
      ) : friends.length === 0 ? (
        <div className="friends-empty">
          <p className="friends-empty__text">{t.friendsEmpty}</p>
          <button type="button" className="play-btn play-btn--vs friends-empty__cta" onClick={onPlayWithFriend}>
            {t.playWithFriend}
          </button>
        </div>
      ) : (
        <ul className="friends-list">
          {friends.map(friend => (
            <li key={friend.uid} className="friends-row">
              <div className="friends-row__info">
                <span className="friends-row__name">{friend.displayName}</span>
                <span className="friends-row__record">
                  {t.friendsRecord
                    .replace('{wins}', String(friend.wins))
                    .replace('{losses}', String(friend.losses))
                    .replace('{ties}', String(friend.ties))}
                </span>
              </div>
              <button
                type="button"
                className="friends-row__challenge"
                disabled={challengingUid === friend.uid}
                onClick={() => onChallenge(friend)}
              >
                {challengingUid === friend.uid ? t.challenging : t.challenge}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
