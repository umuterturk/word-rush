import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  earnedBadgeIds,
  type BadgeCounts,
  type BadgeId,
} from '../domain/badges';
import { useI18n } from '../i18n';
import { getBadgeLabel } from './badgeLabels';

const BADGE_CHARGE_MS = 220;
const BADGE_COUNT_MS = 700;
const BADGE_SETTLE_MS = 180;
const BADGE_STEP_MS = BADGE_CHARGE_MS + BADGE_COUNT_MS + BADGE_SETTLE_MS;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function badgeKind(id: BadgeId): 'fast' | 'streak' | 'double' | 'mp' | 'solo' {
  if (id.startsWith('fast_')) return 'fast';
  if (id.startsWith('streak_')) return 'streak';
  if (id.startsWith('mp_')) return 'mp';
  if (id.startsWith('solo_')) return 'solo';
  return 'double';
}

function badgeTier(id: BadgeId): 1 | 2 | 3 | 4 {
  if (id === 'double') return 1;
  if (id.startsWith('streak_')) {
    const n = Number(id.split('_')[1]);
    if (n >= 7) return 4;
    if (n >= 5) return 3;
    if (n >= 3) return 2;
    return 1;
  }
  return 2;
}

function revealKindClass(id: BadgeId): string {
  return `badge-reveal-card--${badgeKind(id)}`;
}

function revealTierClass(id: BadgeId): string {
  return `badge-reveal-card--tier-${badgeTier(id)}`;
}

function chipKindClass(id: BadgeId): string {
  return `badge-reveal-chip--${badgeKind(id)}`;
}

function chipTierClass(id: BadgeId): string {
  return `badge-reveal-chip--tier-${badgeTier(id)}`;
}

function hapticForBadge(id: BadgeId, phase: 'charge' | 'reveal' | 'done') {
  const tier = badgeTier(id);
  if (phase === 'charge') {
    navigator.vibrate?.(tier === 2 ? [12, 28, 12] : [10, 22]);
    return;
  }
  if (phase === 'reveal') {
    navigator.vibrate?.(tier === 2 ? [22, 45, 28, 65] : [18, 35, 55]);
    return;
  }
  navigator.vibrate?.(tier === 2 ? [14, 30, 20] : [12, 24]);
}

interface Props {
  sessionBadges: BadgeCounts;
  lifetimeBefore: BadgeCounts;
  onComplete?: () => void;
  embedded?: boolean;
}

function BadgeParticles({ id, active }: { id: BadgeId; active: boolean }) {
  if (!active) return null;
  const kind = badgeKind(id);
  const epic = badgeTier(id) === 2;
  const count = epic ? 14 : 10;

  return (
    <div className="badge-reveal-particles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`badge-reveal-particle badge-reveal-particle--${kind}${epic ? ' badge-reveal-particle--epic' : ''}`}
          style={{ '--particle-i': i, '--particle-n': count } as CSSProperties}
        />
      ))}
    </div>
  );
}

function ActiveBadgeCard({
  id,
  sessionCount,
  count,
  isUnlocking,
  isPop,
  showParticles,
  label,
}: {
  id: BadgeId;
  sessionCount: number;
  count: number;
  isUnlocking: boolean;
  isPop: boolean;
  showParticles: boolean;
  label: string;
}) {
  const isEpic = badgeTier(id) === 2;

  return (
    <div
      className={`badge-reveal-card ${revealKindClass(id)} ${revealTierClass(id)} badge-reveal-card--visible badge-reveal-card--active${isUnlocking ? ' badge-reveal-card--unlock' : ''}${isEpic ? ' badge-reveal-card--epic' : ''} badge-reveal-card--spotlight`}
    >
      {showParticles && <BadgeParticles id={id} active />}
      <div className="badge-reveal-card__shine" aria-hidden="true" />
      <span className="badge-reveal-card__label">{label}</span>
      <span className={`badge-reveal-card__count${isPop ? ' badge-reveal-card__count--pop' : ''}`}>
        {count}
      </span>
      {sessionCount > 0 && (
        <span className="badge-reveal-card__delta badge-reveal-card__delta--visible">
          +{sessionCount}
        </span>
      )}
    </div>
  );
}

export function BadgeReveal({
  sessionBadges,
  lifetimeBefore,
  onComplete,
  embedded = false,
}: Props) {
  const { t } = useI18n();
  const cinematic = !embedded;
  const earned = useMemo(() => earnedBadgeIds(sessionBadges), [sessionBadges]);
  const [stepIndex, setStepIndex] = useState(-1);
  const [displayCounts, setDisplayCounts] = useState<BadgeCounts>(() => ({ ...lifetimeBefore }));
  const [revealedIds, setRevealedIds] = useState<BadgeId[]>([]);
  const [chargingId, setChargingId] = useState<BadgeId | null>(null);
  const [activeId, setActiveId] = useState<BadgeId | null>(null);
  const [unlockId, setUnlockId] = useState<BadgeId | null>(null);
  const [popCountId, setPopCountId] = useState<BadgeId | null>(null);
  const [allComplete, setAllComplete] = useState(false);
  const [done, setDone] = useState(false);
  const popClearRef = useRef<number | null>(null);

  const earnedKey = earned.join(',');
  const lifetimeBeforeRef = useRef(lifetimeBefore);
  lifetimeBeforeRef.current = lifetimeBefore;
  const onCompleteRef = useRef<() => void>(() => {});
  onCompleteRef.current = onComplete ?? (() => {});

  useEffect(() => {
    if (earned.length === 0) {
      onCompleteRef.current();
      return;
    }

    setStepIndex(0);
    setRevealedIds([]);
    setDisplayCounts({ ...lifetimeBeforeRef.current });
    setChargingId(null);
    setActiveId(null);
    setUnlockId(null);
    setPopCountId(null);
    setAllComplete(false);
    setDone(false);
  }, [earnedKey, earned.length]);

  useEffect(() => {
    if (stepIndex < 0 || stepIndex >= earned.length) return;

    const id = earned[stepIndex];
    const sessionCount = sessionBadges[id] ?? 0;
    const startCount = lifetimeBeforeRef.current[id] ?? 0;
    const endCount = startCount + sessionCount;
    const tickSteps = Math.max(sessionCount, 1);
    const timers: number[] = [];

    setChargingId(id);
    setActiveId(null);
    setUnlockId(null);
    hapticForBadge(id, 'charge');

    const triggerCountPop = () => {
      setPopCountId(id);
      if (popClearRef.current !== null) {
        window.clearTimeout(popClearRef.current);
      }
      popClearRef.current = window.setTimeout(() => {
        setPopCountId(current => (current === id ? null : current));
        popClearRef.current = null;
      }, 260);
    };

    timers.push(
      window.setTimeout(() => {
        setChargingId(null);
        setRevealedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
        setActiveId(id);
        setUnlockId(id);
        setDisplayCounts(prev => ({ ...prev, [id]: startCount }));
        hapticForBadge(id, 'reveal');

        window.setTimeout(() => setUnlockId(current => (current === id ? null : current)), 520);

        for (let step = 1; step <= tickSteps; step += 1) {
          const progress = step / tickSteps;
          const delay = Math.round(BADGE_COUNT_MS * easeOutCubic(progress));
          const nextCount = sessionCount > 0 ? startCount + step : endCount;
          timers.push(
            window.setTimeout(() => {
              setDisplayCounts(prev => ({ ...prev, [id]: nextCount }));
              triggerCountPop();
              if (nextCount >= endCount) {
                hapticForBadge(id, 'done');
              }
            }, delay),
          );
        }
      }, BADGE_CHARGE_MS),
    );

    timers.push(
      window.setTimeout(() => {
        setDisplayCounts(prev => ({ ...prev, [id]: endCount }));
        setActiveId(current => (current === id ? null : current));
        setStepIndex(prev => prev + 1);
      }, BADGE_STEP_MS),
    );

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [stepIndex, earned, sessionBadges]);

  useEffect(() => {
    if (earned.length === 0 || stepIndex < earned.length) return;
    if (done) return;
    setActiveId(null);
    setChargingId(null);
    setAllComplete(true);
    navigator.vibrate?.([20, 40, 30, 55, 40]);
    setDone(true);
    const timer = window.setTimeout(() => onCompleteRef.current(), cinematic ? 650 : 300);
    return () => window.clearTimeout(timer);
  }, [stepIndex, earned.length, done, cinematic]);

  useEffect(
    () => () => {
      if (popClearRef.current !== null) {
        window.clearTimeout(popClearRef.current);
      }
    },
    [],
  );

  if (earned.length === 0) return null;

  const currentStep = stepIndex >= 0 && stepIndex < earned.length ? stepIndex : earned.length;
  const settledIds = revealedIds.filter(id => id !== activeId);
  const pillIds = allComplete ? earned : settledIds;
  const showSpotlight = !allComplete && (chargingId !== null || activeId !== null);

  return (
    <div
      className={`badge-reveal${embedded ? ' badge-reveal--embedded' : ' badge-reveal--cinematic'}${allComplete ? ' badge-reveal--complete' : ''}`}
      aria-live="polite"
    >
      <div className="badge-reveal__header">
        <h3 className="badge-reveal__title">{t.badgesCollectedTitle}</h3>
        {cinematic && (
          <p className="badge-reveal__subtitle">{t.badgesCollectedSubtitle}</p>
        )}
        {earned.length > 1 && !allComplete && (
          <div className="badge-reveal__progress" aria-hidden="true">
            {earned.map((id, index) => (
              <span
                key={id}
                className={`badge-reveal__pip${index < currentStep ? ' badge-reveal__pip--done' : ''}${index === stepIndex ? ' badge-reveal__pip--active' : ''}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="badge-reveal__stage">
        {pillIds.length > 0 && (
          <div
            className={`badge-reveal-collected${allComplete ? ' badge-reveal-collected--settled' : ''}`}
          >
            {pillIds.map(id => {
              const sessionCount = sessionBadges[id] ?? 0;
              const total = displayCounts[id] ?? lifetimeBefore[id] ?? 0;
              return (
                <div
                  key={id}
                  className={`badge-reveal-chip ${chipKindClass(id)} ${chipTierClass(id)} badge-reveal-chip--settled`}
                  title={getBadgeLabel(t, id)}
                >
                  <span className="badge-reveal-chip__label">{getBadgeLabel(t, id)}</span>
                  <span className="badge-reveal-chip__count">{total}</span>
                  {sessionCount > 0 && (
                    <span className="badge-reveal-chip__delta">+{sessionCount}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showSpotlight && (
          <div className="badge-reveal__spotlight">
            {chargingId && (
              <div
                className={`badge-reveal-slot ${revealKindClass(chargingId)} ${revealTierClass(chargingId)}`}
                key={`charge-${chargingId}-${stepIndex}`}
              >
                <div className="badge-reveal-slot__ring" />
                <div className="badge-reveal-slot__core" />
                <span className="badge-reveal-slot__label">?</span>
              </div>
            )}

            {activeId && revealedIds.includes(activeId) && (
              <ActiveBadgeCard
                id={activeId}
                sessionCount={sessionBadges[activeId] ?? 0}
                count={displayCounts[activeId] ?? 0}
                isUnlocking={activeId === unlockId}
                isPop={popCountId === activeId}
                showParticles={cinematic}
                label={getBadgeLabel(t, activeId)}
              />
            )}
          </div>
        )}
      </div>

      {cinematic && allComplete && (
        <div className="badge-reveal__finale" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="badge-reveal__spark"
              style={{ '--spark-i': i } as CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
