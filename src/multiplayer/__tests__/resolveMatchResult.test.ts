import { describe, expect, it } from 'vitest';
import { resolveMatchResult } from '../types';

describe('resolveMatchResult', () => {
  it('awards a win when the opponent resigned, regardless of score', () => {
    expect(resolveMatchResult(3, 50, true)).toBe('win');
    expect(resolveMatchResult(0, 100, true)).toBe('win');
  });

  it('compares scores when nobody resigned', () => {
    expect(resolveMatchResult(10, 5, false)).toBe('win');
    expect(resolveMatchResult(4, 9, false)).toBe('lose');
    expect(resolveMatchResult(7, 7, false)).toBe('tie');
  });
});
