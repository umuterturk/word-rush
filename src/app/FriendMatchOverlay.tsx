import { useI18n } from '../i18n';

interface Props {
  phase: 'creating' | 'sharing' | 'waiting' | 'found';
  inviteCopied: boolean;
  error: string | null;
  onCancel: () => void;
}

export function FriendMatchOverlay({ phase, inviteCopied, error, onCancel }: Props) {
  const { t } = useI18n();

  return (
    <div className="friend-match-overlay">
      <div className="friend-match-popup">
        {phase === 'creating' || phase === 'sharing' ? (
          <>
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="friend-match-status">
              {phase === 'creating' ? t.creatingRoom : t.sharingInvite}
            </h2>
          </>
        ) : phase === 'found' ? (
          <div className="opponent-found">
            <span className="opponent-found-name">{t.opponentFound}</span>
          </div>
        ) : (
          <>
            {inviteCopied && (
              <>
                <p className="friend-match-copied">{t.linkCopied}</p>
                <p className="friend-match-hint">{t.shareInviteHint}</p>
              </>
            )}
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="friend-match-status">{t.waitingToJoin}</h2>
          </>
        )}

        {error && <p className="lobby-error">{error}</p>}

        <button className="cancel-btn" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
