import { useI18n } from '../i18n';

interface Props {
  onInviteFriend: () => void;
  onMainMenu: () => void;
}

export function RoomUnavailableScreen({ onInviteFriend, onMainMenu }: Props) {
  const { t } = useI18n();

  return (
    <div className="screen room-unavailable-screen">
      <div className="room-unavailable-content">
        <h2 className="room-unavailable-title">{t.gameUnavailable}</h2>
        <p className="room-unavailable-hint">{t.gameUnavailableHint}</p>

        <div className="room-unavailable-actions">
          <button className="play-btn play-btn--vs" onClick={onInviteFriend}>
            {t.inviteFriend}
          </button>
          <button className="play-btn play-btn--secondary" onClick={onMainMenu}>
            {t.menu}
          </button>
        </div>
      </div>
    </div>
  );
}
