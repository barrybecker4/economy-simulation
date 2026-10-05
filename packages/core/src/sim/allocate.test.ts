import { describe, expect, it } from 'vitest';
import { splitEqual, splitProportional } from './allocate.js';

describe('allocate', () => {
  it('splits proportionally and gives the remainder to the last part', () => {
    const parts = splitProportional(100, [1, 1, 1]);
    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(parts.slice(0, 2)).toEqual([33, 33]);
    expect(parts[2]).toBe(34);
  });

  it('returns zeros when every weight is zero', () => {
    expect(splitProportional(50, [0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('splits equally and gives the remainder to the last part', () => {
    const parts = splitEqual(10, 3);
    expect(parts).toEqual([3, 3, 4]);
    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(10);
  });
});
