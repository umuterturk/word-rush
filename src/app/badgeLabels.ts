import type { BadgeId } from '../domain/badges';
import type { Translations } from '../i18n/translations';

export function getBadgeIcon(id: BadgeId): string {
  if (id === 'fast_1') return '⚡';
  if (id === 'fast_2') return '⚡';
  if (id === 'double') return '✦';
  if (id.startsWith('streak_')) return '🔥';
  if (id === 'solo_debut') return '🌱';
  if (id === 'solo_grinder') return '💎';
  if (id === 'mp_debut') return '🤝';
  if (id === 'mp_sparring') return '⚔️';
  if (id === 'mp_arena') return '🏟️';
  if (id === 'mp_gladiator') return '🛡️';
  if (id === 'mp_legend') return '👑';
  if (id === 'mp_champion') return '🏆';
  if (id === 'mp_dominator') return '💥';
  return '★';
}

export function getBadgeDescription(t: Translations, id: BadgeId): string {
  if (id.startsWith('streak_')) {
    return t.badgeDescStreak.replace('{count}', id.split('_')[1] ?? '');
  }
  switch (id) {
    case 'fast_1':
      return t.badgeDescFast1;
    case 'fast_2':
      return t.badgeDescFast2;
    case 'double':
      return t.badgeDescDouble;
    case 'mp_debut':
      return t.badgeDescMpDebut;
    case 'mp_sparring':
      return t.badgeDescMpSparring;
    case 'mp_arena':
      return t.badgeDescMpArena;
    case 'mp_gladiator':
      return t.badgeDescMpGladiator;
    case 'mp_legend':
      return t.badgeDescMpLegend;
    case 'mp_champion':
      return t.badgeDescMpChampion;
    case 'mp_dominator':
      return t.badgeDescMpDominator;
    case 'solo_debut':
      return t.badgeDescSoloDebut;
    case 'solo_grinder':
      return t.badgeDescSoloGrinder;
    default:
      return '';
  }
}

export function getBadgeShortLabel(t: Translations, id: BadgeId): string {
  if (id.startsWith('streak_')) {
    return `${id.split('_')[1]}×`;
  }
  switch (id) {
    case 'fast_1':
      return t.badgeShortFast1;
    case 'fast_2':
      return t.badgeShortFast2;
    case 'double':
      return t.badgeShortDouble;
    case 'mp_debut':
      return t.badgeShortMpDebut;
    case 'mp_sparring':
      return t.badgeShortMpSparring;
    case 'mp_arena':
      return t.badgeShortMpArena;
    case 'mp_gladiator':
      return t.badgeShortMpGladiator;
    case 'mp_legend':
      return t.badgeShortMpLegend;
    case 'mp_champion':
      return t.badgeShortMpChampion;
    case 'mp_dominator':
      return t.badgeShortMpDominator;
    case 'solo_debut':
      return t.badgeShortSoloDebut;
    case 'solo_grinder':
      return t.badgeShortSoloGrinder;
    default:
      return `${id}`;
  }
}

export function getBadgeLabel(t: Translations, id: BadgeId): string {
  switch (id) {
    case 'fast_1':
      return t.fastBonus1;
    case 'fast_2':
      return t.fastBonus2;
    case 'double':
      return t.doubleBonusActive;
    case 'streak_2':
      return t.streakBadge2;
    case 'streak_3':
      return t.streakBadge3;
    case 'streak_4':
      return t.streakBadge4;
    case 'streak_5':
      return t.streakBadge5;
    case 'streak_6':
      return t.streakBadge6;
    case 'streak_7':
      return t.streakBadge7;
    case 'mp_debut':
      return t.badgeMpDebut;
    case 'mp_sparring':
      return t.badgeMpSparring;
    case 'mp_arena':
      return t.badgeMpArena;
    case 'mp_gladiator':
      return t.badgeMpGladiator;
    case 'mp_legend':
      return t.badgeMpLegend;
    case 'mp_champion':
      return t.badgeMpChampion;
    case 'mp_dominator':
      return t.badgeMpDominator;
    case 'solo_debut':
      return t.badgeSoloDebut;
    case 'solo_grinder':
      return t.badgeSoloGrinder;
  }
}

export function badgeKindClass(id: BadgeId): string {
  if (id.startsWith('fast_')) return 'profile-badge--fast';
  if (id.startsWith('streak_')) return 'profile-badge--streak';
  if (id.startsWith('mp_')) return 'profile-badge--mp';
  if (id.startsWith('solo_')) return 'profile-badge--solo';
  return 'profile-badge--double';
}

export function badgeTierClass(id: BadgeId): string {
  if (id === 'double') return 'profile-badge--tier-1';
  if (id.startsWith('streak_')) {
    const tier = Number(id.split('_')[1]);
    return `profile-badge--tier-${Math.min(tier, 4)}`;
  }
  const tier = Number(id.split('_').pop());
  if (Number.isFinite(tier) && tier > 0) {
    return `profile-badge--tier-${Math.min(tier, 4)}`;
  }
  return 'profile-badge--tier-1';
}

export function streakCalloutLabel(t: Translations, streak: number): string {
  switch (streak) {
    case 2:
      return t.streakBadge2;
    case 3:
      return t.streakBadge3;
    case 4:
      return t.streakBadge4;
    case 5:
      return t.streakBadge5;
    case 6:
      return t.streakBadge6;
    case 7:
      return t.streakBadge7;
    default:
      return t.wordStreakPop.replace('{count}', String(streak));
  }
}
