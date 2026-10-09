import { describe, expect, it } from 'vitest';
import { meanAbsolute, percentile, seriesBand } from './quantile.js';

describe('percentile', () => {
  const sample = [10, 20, 30, 40, 50];

  it('interpolates the 5th, 50th, and 95th percentiles', () => {
    expect(percentile(sample, 0.05)).toBeCloseTo(12);
    expect(percentile(sample, 0.5)).toBe(30);
    expect(percentile(sample, 0.95)).toBeCloseTo(48);
  });

  it('returns the only sample at every fraction', () => {
    expect(percentile([7], 0)).toBe(7);
    expect(percentile([7], 1)).toBe(7);
  });

  it('rejects an empty sample and a fraction outside 0 to 1', () => {
    expect(() => percentile([], 0.5)).toThrow(/empty sample/);
    expect(() => percentile(sample, -0.01)).toThrow(/between 0 and 1/);
    expect(() => percentile(sample, 1.1)).toThrow(/between 0 and 1/);
  });
});

describe('seriesBand', () => {
  it('bands each tick independently', () => {
    const band = seriesBand([
      [1, 10],
      [3, 30],
      [5, 50],
    ]);
    expect(band.mid).toEqual([3, 30]);
    expect(band.low[0]).toBeCloseTo(1.2);
    expect(band.high[1]).toBeCloseTo(48);
  });

  it('rejects runs of different lengths', () => {
    expect(() => seriesBand([[1, 2], [3]])).toThrow(/different lengths/);
    expect(() => seriesBand([])).toThrow(/at least one run/);
  });
});

describe('meanAbsolute', () => {
  it('weights a larger impulse more than several smaller ones', () => {
    const means = meanAbsolute([
      [0, 0.05, 0],
      [0, 0, -0.2],
      [0, 0.1, 0],
    ]);
    expect(means[0]).toBe(0);
    expect(means[1]).toBeCloseTo(0.05);
    expect(means[2]).toBeCloseTo(0.2 / 3);
    expect(means[2]).toBeGreaterThan(means[1] ?? 0);
  });

  it('rejects runs of different lengths', () => {
    expect(() => meanAbsolute([[1, 2], [3]])).toThrow(/different lengths/);
    expect(() => meanAbsolute([])).toThrow(/at least one run/);
  });
});
