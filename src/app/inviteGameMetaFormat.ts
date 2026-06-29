import type { GameLanguage } from '../domain/types';
import type { Translations } from '../i18n/translations';

export interface InviteGameMeta {
  creatorName?: string;
  language: GameLanguage;
  matchDurationMs: number;
  createdAt: number | null;
}

export function formatGameLanguage(language: GameLanguage, t: Translations): string {
  return language === 'tr' ? t.gameLangTr : t.gameLangEn;
}

export function formatMatchDuration(minutes: number, t: Translations): string {
  return t.gameDurationMin.replace('{n}', String(minutes));
}

export function formatRelativeCreatedAt(
  createdAt: number,
  t: Translations,
  now = Date.now(),
): string {
  const diffMs = Math.max(0, now - createdAt);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t.gameCreatedJustNow;
  if (minutes < 60) return t.gameCreatedMinutesAgo.replace('{n}', String(minutes));

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.gameCreatedHoursAgo.replace('{n}', String(hours));

  const days = Math.floor(hours / 24);
  return t.gameCreatedDaysAgo.replace('{n}', String(days));
}
