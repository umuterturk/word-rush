export const TARGET_SUM = 21;
export const MAX_STACK_SIZE = 5;
export const MATCH_DURATION_MS = 120_000;
export const REMOVE_COOLDOWN_MS = 300;

export const NUMBER_MIN = 1;
export const NUMBER_MAX = 7;

// Relative spawn weights for each value (1–7). Lower weight = rarer.
// Bell curve centered on 4: extremes (1, 7) are rare, middle values common.
export const NUMBER_WEIGHTS: Record<number, number> = {
  1: 0.5,
  2: 0.8,
  3: 1.0,
  4: 1.2,
  5: 1.0,
  6: 0.8,
  7: 0.5,
};

// Per-tile random fall speed (fraction of arena height per ms)
export const FALL_SPEED_MIN = 0.00018;
export const FALL_SPEED_MAX = 0.00034;

// Speed multiplier at match start vs end (tiles fall faster as time passes)
export const FALL_SPEED_RAMP_START = 1.0;
export const FALL_SPEED_RAMP_END = 2.0;

// Wave spawns: how many tiles appear together each wave
export const SPAWN_WAVE_MIN = 2;
export const SPAWN_WAVE_MAX = 4;

// Time between successive spawn waves
export const SPAWN_INTERVAL_MIN = 700;   // ms
export const SPAWN_INTERVAL_VARIANCE = 900; // ms

// Stop spawning this many ms before match ends (tiles still need time to fall)
export const SPAWN_CUTOFF_BEFORE_END_MS = 1_500;

// Tile dimensions as fraction of arena width (for hit-test awareness)
export const TILE_RADIUS_NORM = 0.07;
