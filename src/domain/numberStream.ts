import type { NumberStreamEntry } from './types';
import { createSeededRng } from './seededRng';
import {
  MATCH_DURATION_MS,
  NUMBER_MIN,
  NUMBER_MAX,
  NUMBER_WEIGHTS,
  FALL_SPEED_MIN,
  FALL_SPEED_MAX,
  FALL_SPEED_RAMP_START,
  FALL_SPEED_RAMP_END,
  SPAWN_WAVE_MIN,
  SPAWN_WAVE_MAX,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_VARIANCE,
  SPAWN_CUTOFF_BEFORE_END_MS,
} from './constants';

// Pre-compute weighted value selection table
let totalWeight = 0;
for (let v = NUMBER_MIN; v <= NUMBER_MAX; v++) {
  totalWeight += NUMBER_WEIGHTS[v] ?? 1;
}
const WEIGHTED_THRESHOLDS: { value: number; cumulative: number }[] = [];
let cumulative = 0;
for (let v = NUMBER_MIN; v <= NUMBER_MAX; v++) {
  cumulative += (NUMBER_WEIGHTS[v] ?? 1) / totalWeight;
  WEIGHTED_THRESHOLDS.push({ value: v, cumulative });
}

/** Pick a tile value using weighted probabilities. */
function randomWeightedValue(rng: () => number): number {
  const r = rng();
  for (const { value, cumulative } of WEIGHTED_THRESHOLDS) {
    if (r < cumulative) return value;
  }
  return NUMBER_MAX;
}

/**
 * Five evenly-distributed horizontal lanes.
 * Using fixed lanes prevents tiles from overlapping horizontally
 * and keeps the arena readable at any screen width.
 */
const LANES: readonly number[] = [0.12, 0.28, 0.50, 0.72, 0.88];

const SPAWN_CUTOFF_MS = MATCH_DURATION_MS - SPAWN_CUTOFF_BEFORE_END_MS;

/**
 * Speed multiplier that ramps from start to end as match time progresses.
 * Uses a parabolic (ease-in) curve: slow acceleration early, faster later.
 */
function fallSpeedRamp(spawnTime: number): number {
  const progress = Math.min(1, spawnTime / SPAWN_CUTOFF_MS);
  // Parabolic ease-in: progress² starts gentle, accelerates toward the end
  const eased = progress * progress;
  return (
    FALL_SPEED_RAMP_START +
    eased * (FALL_SPEED_RAMP_END - FALL_SPEED_RAMP_START)
  );
}

/** Random per-tile speed scaled by the time-based ramp. */
function randomFallSpeed(rng: () => number, spawnTime: number): number {
  const base = FALL_SPEED_MIN + rng() * (FALL_SPEED_MAX - FALL_SPEED_MIN);
  return base * fallSpeedRamp(spawnTime);
}

/**
 * Wave size increases as match progresses.
 * Early: 2-3 tiles per wave. Late: 3-5 tiles per wave.
 */
function getWaveSize(rng: () => number, spawnTime: number): number {
  const progress = Math.min(1, spawnTime / SPAWN_CUTOFF_MS);
  // Gradually shift the min from SPAWN_WAVE_MIN toward SPAWN_WAVE_MIN+1
  const minBoost = Math.floor(progress * 1.5);
  const effectiveMin = Math.min(SPAWN_WAVE_MIN + minBoost, SPAWN_WAVE_MAX - 1);
  const effectiveMax = SPAWN_WAVE_MAX;
  return effectiveMin + Math.floor(rng() * (effectiveMax - effectiveMin + 1));
}

/** Pick distinct lane indices for a wave (no two tiles in the same lane). */
function pickLaneIndices(rng: () => number, count: number): number[] {
  const available = LANES.map((_, i) => i);
  const picked: number[] = [];

  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(rng() * available.length);
    picked.push(available[idx]);
    available.splice(idx, 1);
  }

  return picked;
}

/**
 * Generates the complete number stream for a match before play begins.
 * Same seed always produces an identical stream, which is required for
 * deterministic replay (future multiplayer).
 *
 * Spawns arrive in waves of 2–4 tiles with distinct lanes.
 * Each tile gets a random fall speed, scaled up as the match progresses.
 *
 * Coordinates are normalized (0..1) so the stream is viewport-independent.
 */
export function generateNumberStream(seed: string): NumberStreamEntry[] {
  const rng = createSeededRng(seed);
  const entries: NumberStreamEntry[] = [];

  // First wave spawns 600 ms in so the player has time to orient.
  let time = 600;
  let idx = 0;

  while (time < SPAWN_CUTOFF_MS) {
    const waveSize = getWaveSize(rng, time);
    const lanes = pickLaneIndices(rng, waveSize);
    const spawnTime = Math.round(time);

    for (const laneIdx of lanes) {
      entries.push({
        id: `n${idx}`,
        value: randomWeightedValue(rng),
        spawnTime,
        xPosition: LANES[laneIdx],
        fallSpeed: randomFallSpeed(rng, spawnTime),
      });
      idx++;
    }

    time += SPAWN_INTERVAL_MIN + rng() * SPAWN_INTERVAL_VARIANCE;
  }

  return entries.sort((a, b) =>
    a.spawnTime !== b.spawnTime ? a.spawnTime - b.spawnTime : a.id.localeCompare(b.id),
  );
}
