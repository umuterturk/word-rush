import { useState } from 'react';

type LobbyMode = 'quick' | 'create' | 'join';

interface Props {
  mode: LobbyMode;
  inviteCode: string | null;
  opponentName: string;
  error: string | null;
  isSearching?: boolean;
  isRematch?: boolean;
  onCancel: () => void;
  onJoin: (code: string) => void;
}

function getInviteUrl(code: string): string {
  const base = window.location.origin + import.meta.env.BASE_URL;
  return `${base}?join=${code}`;
}

async function shareInvite(code: string): Promise<void> {
  const url = getInviteUrl(code);
  const shareData = {
    title: 'Word Rush 1v1',
    text: 'Join my game!',
    url,
  };

  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
  } else {
    await navigator.clipboard.writeText(url);
  }
}

export function MultiplayerLobbyScreen({
  mode,
  inviteCode,
  opponentName,
  error,
  isSearching = false,
  isRematch = false,
  onCancel,
  onJoin,
}: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const isWaiting = mode === 'quick' || mode === 'create';
  const opponentFound = Boolean(opponentName);

  return (
    <div className="screen lobby-screen">
      <div className="lobby-content">
        {isRematch && (
          <>
            <div className="lobby-rematch-badge">REMATCH</div>
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="lobby-title">WAITING FOR OPPONENT</h2>
            <p className="lobby-subtitle">Challenging your rival again...</p>
          </>
        )}

        {!isRematch && mode === 'quick' && (
          <>
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="lobby-title">FINDING OPPONENT</h2>
            <p className="lobby-subtitle">Searching for a rival...</p>
          </>
        )}

        {!isRematch && mode === 'create' && (
          <>
            <h2 className="lobby-title">YOUR ROOM</h2>
            {inviteCode ? (
              <>
                <div className="room-code">{inviteCode}</div>
                <button
                  className="share-btn"
                  onClick={() => {
                    void shareInvite(inviteCode).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                >
                  {copied ? 'LINK COPIED!' : 'SHARE INVITE LINK'}
                </button>
              </>
            ) : (
              <div className="lobby-spinner" aria-hidden="true" />
            )}
          </>
        )}

        {!isRematch && mode === 'join' && !isSearching && (
          <>
            <h2 className="lobby-title">JOIN ROOM</h2>
            <input
              className="room-code-input"
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
            />
            <button
              className="play-btn play-btn--secondary"
              disabled={joinCode.trim().length < 4}
              onClick={() => onJoin(joinCode.trim())}
            >
              JOIN
            </button>
          </>
        )}

        {!isRematch && mode === 'join' && isSearching && (
          <>
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="lobby-title">JOINING ROOM</h2>
            <p className="lobby-subtitle">Connecting...</p>
          </>
        )}

        {!isRematch && isWaiting && opponentFound && (
          <div className="opponent-found">
            <span className="opponent-found-name">OPPONENT FOUND</span>
          </div>
        )}

        {isWaiting && !opponentFound && mode !== 'quick' && inviteCode && (
          <p className="lobby-waiting">Waiting for opponent to join...</p>
        )}

        {error && <p className="lobby-error">{error}</p>}

        <button className="cancel-btn" onClick={onCancel}>
          CANCEL
        </button>
      </div>
    </div>
  );
}
