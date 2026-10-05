import { describe, expect, it } from 'vitest';
import { bottomShare, gini, mean, median, monthlyFromAnnual, topShare } from './stats.js';

describe('stats', () => {
  it('reports a zero Gini for equal values', () => {
    expect(gini([2, 2, 2, 2])).toBe(0);
  });

  it('reports a known unequal Gini and shifts negatives', () => {
    expect(gini([0, 0, 0, 100])).toBeCloseTo(0.75, 10);
    expect(gini([-10, 0, 10])).toBe(gini([0, 10, 20]));
  });

  it('computes mean, even-length median, and monthly compounding', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(monthlyFromAnnual(0.12)).toBeCloseTo(1.12 ** (1 / 12) - 1, 12);
  });

  it('computes top and bottom shares', () => {
    expect(topShare([1, 2, 3, 4, 90], 0.2)).toBeCloseTo(90 / 100, 10);
    expect(bottomShare([1, 2, 3, 4, 90], 0.2)).toBeCloseTo(1 / 100, 10);
  });
});
