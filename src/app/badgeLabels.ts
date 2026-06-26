import type { BadgeId } from '../domain/badges';
import type { Translations } from '../i18n/translations';

export function getBadgeLabel(t: Translations, id: BadgeId): string {
  switch (id) {
    case 'fast_1':
      return t.fastBonus1;
    case 'fast_2':
      return t.fastBonus2;
    case 'rare_1':
      return t.rareBonus1;
    case 'rare_2':
      return t.rareBonus2;
    case 'double':
      return t.doubleBonusActive;
  }
}

export function badgeKindClass(id: BadgeId): string {
  if (id.startsWith('fast_')) return 'profile-badge--fast';
  if (id.startsWith('rare_')) return 'profile-badge--rare';
  return 'profile-badge--double';
}

export function badgeTierClass(id: BadgeId): string {
  const tier = id === 'double' ? 1 : Number(id.split('_')[1]);
  return `profile-badge--tier-${tier}`;
}
