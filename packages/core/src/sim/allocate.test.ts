import { describe, expect, it } from 'vitest';
import { powerWeights, splitEqual, splitProportional, splitResidual } from './allocate.js';

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

  it('keeps a finite split when a weight overflows', () => {
    const parts = splitProportional(100, [1, Number.POSITIVE_INFINITY, 2]);
    expect(parts.every((part) => Number.isFinite(part))).toBe(true);
    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(parts).toEqual([0, 100, 0]);
  });

  it('matches a direct power while every power is finite', () => {
    expect(powerWeights([0.5, 1, 2], 1.5)).toEqual([0.5 ** 1.5, 1, 2 ** 1.5]);
  });

  it('keeps the larger base ahead when a raw power overflows', () => {
    expect(4.5 ** 500).toBe(Number.POSITIVE_INFINITY);
    const weights = powerWeights([4, 4.5], 500);
    expect(weights.every((weight) => Number.isFinite(weight))).toBe(true);
    expect(weights[1]).toBe(1);
    expect(weights[0]).toBeLessThan(1e-20);
  });

  it('gives the residual to the last part so an unrounded split sums exactly', () => {
    const parts = splitResidual(10, [1, 1, 2]);
    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(10);
    expect(parts[0]).toBeCloseTo(2.5, 12);
    expect(parts[1]).toBeCloseTo(2.5, 12);
    expect(parts[2]).toBeCloseTo(5, 12);
  });

  it('rejects a non-finite weight instead of dropping it', () => {
    expect(() => splitResidual(10, [1, Number.POSITIVE_INFINITY])).toThrow(/finite/);
  });

  it('splits equally and gives the remainder to the last part', () => {
    const parts = splitEqual(10, 3);
    expect(parts).toEqual([3, 3, 4]);
    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(10);
  });
});
