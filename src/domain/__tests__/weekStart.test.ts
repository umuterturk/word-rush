import { describe, expect, it } from 'vitest';
import { getDayStartUtc, getWeekStartMondayUtc } from '../weekStart';

describe('getWeekStartMondayUtc', () => {
  it('returns the same Monday when given a Monday', () => {
    const monday = new Date('2026-06-22T15:30:00Z');
    const weekStart = getWeekStartMondayUtc(monday);
    expect(weekStart.toISOString()).toBe('2026-06-22T00:00:00.000Z');
  });

  it('rolls back to Monday from later in the week', () => {
    const thursday = new Date('2026-06-25T12:00:00Z');
    const weekStart = getWeekStartMondayUtc(thursday);
    expect(weekStart.toISOString()).toBe('2026-06-22T00:00:00.000Z');
  });

  it('rolls back from Sunday to the previous Monday', () => {
    const sunday = new Date('2026-06-28T23:59:00Z');
    const weekStart = getWeekStartMondayUtc(sunday);
    expect(weekStart.toISOString()).toBe('2026-06-22T00:00:00.000Z');
  });
});

describe('getDayStartUtc', () => {
  it('returns midnight UTC for the given calendar day', () => {
    const afternoon = new Date('2026-06-25T14:31:00Z');
    expect(getDayStartUtc(afternoon).toISOString()).toBe('2026-06-25T00:00:00.000Z');
  });
});
