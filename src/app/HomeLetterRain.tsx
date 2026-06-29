import { useMemo, type CSSProperties } from 'react';

const RAIN_LETTERS = ['Y', 'A', 'Z', 'R', 'U', 'Ş', 'H', 'İ', 'Z', 'L', 'E', 'T'] as const;

const RAIN_COLORS = ['#ffd54f', '#4fc3f7', '#81c784', '#ce93d8', '#ff8a65', '#fff176'];

interface RainDrop {
  id: number;
  letter: string;
  color: string;
  leftPct: number;
  delayS: number;
  durationS: number;
  sizePx: number;
  driftPx: number;
}

export function HomeLetterRain() {
  const drops = useMemo<RainDrop[]>(
    () =>
      RAIN_LETTERS.map((letter, i) => ({
        id: i,
        letter,
        color: RAIN_COLORS[i % RAIN_COLORS.length],
        leftPct: 4 + ((i * 17) % 92),
        delayS: (i * 0.55) % 4.2,
        durationS: 5.5 + (i % 4) * 1.1,
        sizePx: 14 + (i % 3) * 5,
        driftPx: (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 6),
      })),
    [],
  );

  return (
    <div className="home-letter-rain" aria-hidden="true">
      {drops.map(drop => (
        <span
          key={drop.id}
          className="home-letter-rain__drop"
          style={
            {
              '--drop-left': `${drop.leftPct}%`,
              '--drop-delay': `${drop.delayS}s`,
              '--drop-duration': `${drop.durationS}s`,
              '--drop-color': drop.color,
              '--drop-size': `${drop.sizePx}px`,
              '--drop-drift': `${drop.driftPx}px`,
            } as CSSProperties
          }
        >
          {drop.letter}
        </span>
      ))}
    </div>
  );
}
