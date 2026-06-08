import { describe, it, expect } from 'vitest';
import { generateNumberStream } from '../numberStream';
import {
  MATCH_DURATION_MS,
  NUMBER_MIN,
  NUMBER_MAX,
  SPAWN_WAVE_MIN,
  SPAWN_CUTOFF_BEFORE_END_MS,
} from '../constants';

describe('generateNumberStream', () => {
  it('produces identical streams for the same seed', () => {
    const a = generateNumberStream('replay-seed-42');
    const b = generateNumberStream('replay-seed-42');
    expect(a).toEqual(b);
  });

  it('produces different streams for different seeds', () => {
    const a = generateNumberStream('seed-alpha');
    const b = generateNumberStream('seed-beta');
    expect(a).not.toEqual(b);
  });

  it('generates a non-empty stream', () => {
    const stream = generateNumberStream('any-seed');
    expect(stream.length).toBeGreaterThan(0);
  });

  it('values are in the NUMBER_MIN–NUMBER_MAX range', () => {
    const stream = generateNumberStream('range-check');
    for (const entry of stream) {
      expect(entry.value).toBeGreaterThanOrEqual(NUMBER_MIN);
      expect(entry.value).toBeLessThanOrEqual(NUMBER_MAX);
      expect(Number.isInteger(entry.value)).toBe(true);
    }
  });

  it('spawn times are non-decreasing (waves can share the same time)', () => {
    const stream = generateNumberStream('ordering-check');
    for (let i = 1; i < stream.length; i++) {
      expect(stream[i].spawnTime).toBeGreaterThanOrEqual(stream[i - 1].spawnTime);
    }
  });

  it('spawns multiple tiles per wave on average', () => {
    const stream = generateNumberStream('wave-check');
    const waveCounts = new Map<number, number>();
    for (const entry of stream) {
      waveCounts.set(entry.spawnTime, (waveCounts.get(entry.spawnTime) ?? 0) + 1);
    }
    const sizes = [...waveCounts.values()];
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(SPAWN_WAVE_MIN);
  });

  it('late spawns are faster than early spawns on average', () => {
    const stream = generateNumberStream('ramp-check');
    const earlyThreshold = MATCH_DURATION_MS * 0.2;
    const lateThreshold = MATCH_DURATION_MS * 0.7;
    const early = stream.filter(e => e.spawnTime < earlyThreshold);
    const late = stream.filter(e => e.spawnTime > lateThreshold);
    const avgEarly =
      early.reduce((s, e) => s + e.fallSpeed, 0) / Math.max(1, early.length);
    const avgLate =
      late.reduce((s, e) => s + e.fallSpeed, 0) / Math.max(1, late.length);
    expect(avgLate).toBeGreaterThan(avgEarly);
  });

  it('fall speeds vary between tiles in the same wave', () => {
    const stream = generateNumberStream('speed-variance');
    const byWave = new Map<number, number[]>();
    for (const entry of stream) {
      const speeds = byWave.get(entry.spawnTime) ?? [];
      speeds.push(entry.fallSpeed);
      byWave.set(entry.spawnTime, speeds);
    }
    const multiTileWave = [...byWave.values()].find(speeds => speeds.length >= 2);
    expect(multiTileWave).toBeDefined();
    const uniqueSpeeds = new Set(multiTileWave!.map(s => s.toFixed(8)));
    expect(uniqueSpeeds.size).toBeGreaterThan(1);
  });

  it('all tiles spawn before the spawn cutoff', () => {
    const stream = generateNumberStream('timing-check');
    for (const entry of stream) {
      expect(entry.spawnTime).toBeLessThan(MATCH_DURATION_MS - SPAWN_CUTOFF_BEFORE_END_MS);
    }
  });

  it('ids are unique', () => {
    const stream = generateNumberStream('unique-ids');
    const ids = stream.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('xPosition is within 0..1', () => {
    const stream = generateNumberStream('x-bounds');
    for (const entry of stream) {
      expect(entry.xPosition).toBeGreaterThanOrEqual(0);
      expect(entry.xPosition).toBeLessThanOrEqual(1);
    }
  });
});
