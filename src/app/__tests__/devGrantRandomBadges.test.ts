import { describe, expect, it } from 'vitest';
import { BADGE_IDS } from '../../domain/badges';
import { randomDevBadgeDelta } from '../devGrantRandomBadges';

describe('randomDevBadgeDelta', () => {
  it('grants 1–4 known badge ids', () => {
    const delta = randomDevBadgeDelta();
    const ids = Object.keys(delta);
    expect(ids.length).toBeGreaterThanOrEqual(1);
    expect(ids.length).toBeLessThanOrEqual(4);
    for (const id of ids) {
      expect(BADGE_IDS).toContain(id);
      expect(delta[id as keyof typeof delta]).toBeGreaterThan(0);
    }
  });
});
