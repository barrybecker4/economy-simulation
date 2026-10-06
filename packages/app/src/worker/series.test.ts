import { describe, expect, it } from 'vitest';
import { finiteMetric, requireSeries } from './series.js';

describe('finiteMetric', () => {
  it('copies finite values', () => {
    expect(finiteMetric([1, 2], 'priceLevel')).toEqual([1, 2]);
  });

  it('rejects a missing tick', () => {
    expect(() => finiteMetric([1, null], 'priceLevel')).toThrow(/priceLevel is missing at index 1/);
    expect(() => finiteMetric([Number.NaN], 'priceLevel')).toThrow(/missing at index 0/);
  });
});

describe('requireSeries', () => {
  it('returns the series or throws', () => {
    expect(requireSeries({ priceLevel: [1] }, 'priceLevel')).toEqual([1]);
    expect(() => requireSeries({}, 'priceLevel')).toThrow(/Missing series priceLevel/);
  });
});
