import { useState } from 'react';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();

  const isWaiting = mode === 'quick' || mode === 'create';
  const opponentFound = Boolean(opponentName);

  async function shareInvite(code: string): Promise<void> {
    const url = getInviteUrl(code);
    const shareData = {
      title: t.shareTitle,
      text: t.shareText,
      url,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="screen lobby-screen">
      <div className="lobby-content">
        {isRematch && (
          <>
            <div className="lobby-rematch-badge">{t.rematchBadge}</div>
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="lobby-title">{t.waitingForOpponent}</h2>
            <p className="lobby-subtitle">{t.challengingAgain}</p>
          </>
        )}

        {!isRematch && mode === 'quick' && (
          <>
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="lobby-title">{t.findingOpponent}</h2>
            <p className="lobby-subtitle">{t.searchingForRival}</p>
          </>
        )}

        {!isRematch && mode === 'create' && (
          <>
            <h2 className="lobby-title">{t.yourRoom}</h2>
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
                  {copied ? t.linkCopied : t.shareInviteLink}
                </button>
              </>
            ) : (
              <div className="lobby-spinner" aria-hidden="true" />
            )}
          </>
        )}

        {!isRematch && mode === 'join' && !isSearching && (
          <>
            <h2 className="lobby-title">{t.joinRoomTitle}</h2>
            <input
              className="room-code-input"
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t.enterCode}
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
            />
            <button
              className="play-btn play-btn--secondary"
              disabled={joinCode.trim().length < 4}
              onClick={() => onJoin(joinCode.trim())}
            >
              {t.join}
            </button>
          </>
        )}

        {!isRematch && mode === 'join' && isSearching && (
          <>
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="lobby-title">{t.joiningRoom}</h2>
            <p className="lobby-subtitle">{t.connecting}</p>
          </>
        )}

        {!isRematch && isWaiting && opponentFound && (
          <div className="opponent-found">
            <span className="opponent-found-name">{t.opponentFound}</span>
          </div>
        )}

        {isWaiting && !opponentFound && mode !== 'quick' && inviteCode && (
          <p className="lobby-waiting">{t.waitingToJoin}</p>
        )}

        {error && <p className="lobby-error">{error}</p>}

        <button className="cancel-btn" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
