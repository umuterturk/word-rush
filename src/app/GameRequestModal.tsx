import type { GameRequest } from '../ports';
import { useI18n } from '../i18n';

interface Props {
  request: GameRequest;
  onAccept: () => void;
  onDecline: () => void;
}

export function GameRequestModal({ request, onAccept, onDecline }: Props) {
  const { t } = useI18n();

  return (
    <div className="profile-overlay">
      <div
        className="profile-popup game-request-popup"
        role="dialog"
        aria-labelledby="game-request-title"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="game-request-title" className="profile-popup-title">
          {t.gameRequestTitle}
        </h2>
        <p className="profile-popup-message">
          {t.gameRequestMessage.replace('{name}', request.fromName)}
        </p>
        <div className="profile-popup-actions">
          <button type="button" className="profile-btn profile-btn--ghost" onClick={onDecline}>
            {t.decline}
          </button>
          <button type="button" className="profile-btn profile-btn--primary" onClick={onAccept}>
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
