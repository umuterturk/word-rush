import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

interface Props {
  username: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export function ProfilePopup({ username, onSave, onClose }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(username);
  const inputRef = useRef<HTMLInputElement>(null);

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
        className="profile-popup"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="profile-popup-title"
      >
        <h2 id="profile-popup-title" className="profile-popup-title">
          {t.yourName}
        </h2>
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
