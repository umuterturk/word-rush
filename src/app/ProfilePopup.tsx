import { useEffect, useRef, useState } from 'react';
import { BADGE_IDS, totalBadgeCount, type BadgeCounts } from '../domain/badges';
import { useI18n } from '../i18n';
import { badgeKindClass, badgeTierClass, getBadgeLabel } from './badgeLabels';

interface Props {
  username: string;
  badgeStats?: BadgeCounts;
  onSave: (name: string) => void;
  onClose: () => void;
  message?: string;
}

export function ProfilePopup({ username, badgeStats, onSave, onClose, message }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(username);
  const inputRef = useRef<HTMLInputElement>(null);
  const counts = badgeStats ?? null;
  const totalBadges = counts ? totalBadgeCount(counts) : 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    onSave(draft.trim());
    onClose();
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div
        className="profile-popup profile-popup--with-badges"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="profile-popup-title"
      >
        <h2 id="profile-popup-title" className="profile-popup-title">
          {t.yourName}
        </h2>
        {message && <p className="profile-popup-message">{message}</p>}
        <input
          ref={inputRef}
          className="profile-input"
          type="text"
          value={draft}
          maxLength={20}
          placeholder={t.namePlaceholder}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') onClose();
          }}
          autoComplete="nickname"
          enterKeyHint="done"
        />

        {counts && (
          <section className="profile-badges" aria-label={t.profileBadgesTitle}>
            <div className="profile-badges__header">
              <h3 className="profile-badges__title">{t.profileBadgesTitle}</h3>
              {totalBadges > 0 && (
                <span className="profile-badges__total">
                  {t.profileBadgesTotal.replace('{count}', String(totalBadges))}
                </span>
              )}
            </div>
            {totalBadges === 0 ? (
              <p className="profile-badges__empty">{t.profileBadgesEmpty}</p>
            ) : (
              <div className="profile-badges__grid">
                {BADGE_IDS.map(id => {
                  const count = counts[id] ?? 0;
                  if (count <= 0) return null;
                  return (
                    <div
                      key={id}
                      className={`profile-badge ${badgeKindClass(id)} ${badgeTierClass(id)}`}
                    >
                      <span className="profile-badge__label">{getBadgeLabel(t, id)}</span>
                      <span className="profile-badge__count">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <div className="profile-popup-actions">
          <button className="profile-btn profile-btn--ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button className="profile-btn profile-btn--primary" onClick={handleSave}>
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
