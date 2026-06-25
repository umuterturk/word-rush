import { describe, expect, it } from 'vitest';
import { friendRivalPairId, orderedUids } from '../pairId';

describe('friendRivalPairId', () => {
  it('orders uids lexicographically', () => {
    expect(friendRivalPairId('bbb', 'aaa')).toBe('aaa_bbb');
    expect(friendRivalPairId('aaa', 'bbb')).toBe('aaa_bbb');
    expect(orderedUids('bbb', 'aaa')).toEqual(['aaa', 'bbb']);
  });
});
