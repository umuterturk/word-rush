import { useEffect } from 'react';
import type { HomeEarnedBadge } from './homeBadgeDisplay';
import {
  badgeKindClass,
  getBadgeDescription,
  getBadgeIcon,
  getBadgeLabel,
} from './badgeLabels';
import { useI18n } from '../i18n';

interface Props {
  badge: HomeEarnedBadge;
  onClose: () => void;
}

export function BadgeDetailPopup({ badge, onClose }: Props) {
  const { t } = useI18n();
  const label = getBadgeLabel(t, badge.id);
  const description = getBadgeDescription(t, badge.id);
  const typeLabel = badge.kind === 'title' ? t.badgeDetailTypeTitle : t.badgeDetailTypeSkill;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="profile-overlay badge-detail-overlay" onClick={onClose}>
      <div
        className={`badge-detail-popup ${badgeKindClass(badge.id)}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-detail-title"
      >
        <span className="badge-detail-popup__type">{typeLabel}</span>

        <div className="badge-detail-popup__hero">
          <span className="badge-detail-popup__glow" aria-hidden="true" />
          <span className="badge-detail-popup__icon" aria-hidden="true">
            {getBadgeIcon(badge.id)}
          </span>
        </div>

        <h2 id="badge-detail-title" className="badge-detail-popup__title">
          {label}
        </h2>

        <p className="badge-detail-popup__desc">{description}</p>

        {badge.kind === 'skill' && (
          <p className="badge-detail-popup__count">
            {t.badgeDetailEarnedCount.replace('{count}', String(badge.count))}
          </p>
        )}

        <button type="button" className="badge-detail-popup__close" onClick={onClose}>
          {t.badgeDetailClose}
        </button>
      </div>
    </div>
  );
}
