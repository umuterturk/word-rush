import { useI18n } from '../i18n';
import type { MatchPhase } from '../multiplayer/types';
import {
  formatGameLanguage,
  formatMatchDuration,
  formatRelativeCreatedAt,
  type InviteGameMeta,
} from './inviteGameMetaFormat';

type LobbyMode = 'quick' | 'create' | 'join';

interface Props {
  mode: LobbyMode;
  matchPhase: MatchPhase;
  hostName?: string;
  gameMeta?: InviteGameMeta;
  error: string | null;
  isRematch?: boolean;
  onCancel: () => void;
}

function InviteGameMetaPanel({ meta }: { meta: InviteGameMeta }) {
  const { t } = useI18n();
  const creator = meta.creatorName?.trim();
  const durationMinutes = Math.max(1, Math.round(meta.matchDurationMs / 60_000));

  return (
    <dl className="lobby-meta">
      {creator && (
        <div className="lobby-meta-row">
          <dt className="lobby-meta-label">{t.gameMetaHost}</dt>
          <dd className="lobby-meta-value">{creator}</dd>
        </div>
      )}
      <div className="lobby-meta-row">
        <dt className="lobby-meta-label">{t.gameMetaLanguage}</dt>
        <dd className="lobby-meta-value">{formatGameLanguage(meta.language, t)}</dd>
      </div>
      <div className="lobby-meta-row">
        <dt className="lobby-meta-label">{t.gameMetaDuration}</dt>
        <dd className="lobby-meta-value">{formatMatchDuration(durationMinutes, t)}</dd>
      </div>
      {meta.createdAt != null && (
        <div className="lobby-meta-row">
          <dt className="lobby-meta-label">{t.gameMetaCreated}</dt>
          <dd className="lobby-meta-value">
            {formatRelativeCreatedAt(meta.createdAt, t)}
          </dd>
        </div>
      )}
    </dl>
  );
}

export function MultiplayerLobbyScreen({
  mode,
  matchPhase,
  hostName,
  gameMeta,
  error,
  isRematch = false,
  onCancel,
}: Props) {
  const { t } = useI18n();
  const displayHost = hostName?.trim();
  const showJoinMeta = !isRematch && mode === 'join' && gameMeta != null;

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

        {!isRematch && mode === 'join' && matchPhase === 'searching' && (
          <>
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="lobby-title">{t.joiningRoom}</h2>
            <p className="lobby-subtitle">{t.connecting}</p>
            {showJoinMeta && <InviteGameMetaPanel meta={gameMeta} />}
          </>
        )}

        {!isRematch && mode === 'join' && matchPhase === 'waiting' && (
          <>
            <div className="lobby-spinner" aria-hidden="true" />
            <h2 className="lobby-title">{t.invitedGameTitle}</h2>
            <p className="lobby-subtitle">
              {displayHost
                ? t.invitedGameWaiting.replace('{name}', displayHost)
                : t.invitedGameWaitingAnonymous}
            </p>
            {showJoinMeta && <InviteGameMetaPanel meta={gameMeta} />}
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
