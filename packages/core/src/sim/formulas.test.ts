import { describe, expect, it } from 'vitest';
import { taylorRate } from './central-bank.js';
import { deflationPenaltyFrom, productionCapacity } from './helpers.js';
import { wageGrowth } from './labor.js';
import { automationShare } from './population.js';
import { goodsSpendingShare } from './spending.js';

describe('pure economy formulas', () => {
  it('reduces to ordinary Cobb–Douglas when AI factor is one', () => {
    const capacity = productionCapacity({
      firmProductivity: 1,
      productivity: 1,
      productivityImpulse: 0,
      capital: 8,
      alpha: 0.5,
      labor: 2,
      laborStar: 2,
      aiFactor: 1,
    });
    expect(capacity).toBeCloseTo(8 ** 0.5 * 2 ** 0.5, 12);
  });

  it('puts the automatable share at the midpoint halfway through', () => {
    expect(automationShare(0.1, 0.9, 0.4, 15, 15)).toBeCloseTo(0.5, 12);
    expect(automationShare(0.3, 0.3, 1, 10, 20)).toBe(0.3);
  });

  it('makes downward wage pressure stickier than upward', () => {
    const up = wageGrowth({ trend: 0, tightness: 0.1, rigidity: 0.7 });
    const down = wageGrowth({ trend: 0, tightness: -0.1, rigidity: 0.7 });
    expect(up).toBeCloseTo(0.4 * 0.1 * 0.3, 12);
    expect(down).toBeCloseTo(0.4 * -0.1 * 0.3 ** 2, 12);
    expect(Math.abs(down)).toBeLessThan(Math.abs(up));
  });

  it('computes the Taylor rule and a zero deflation penalty', () => {
    expect(
      taylorRate({
        timePrefMean: 0.04,
        inflation: 0.02,
        inflationTarget: 0.02,
        inflationWeight: 1.5,
        outputWeight: 0.5,
        outputGap: 0.01,
      }),
    ).toBeCloseTo(0.04 + 0.02 + 0.5 * 0.01, 12);
    expect(deflationPenaltyFrom(0, -0.05)).toBe(0);
    expect(deflationPenaltyFrom(2, 0.01)).toBe(0);
    expect(deflationPenaltyFrom(2, -0.05)).toBeCloseTo(0.1, 12);
  });

  it('raises the goods spending share with inflation above the normal path', () => {
    const base = {
      governmentShare: 0.2,
      timePref: 0.04,
      timePrefMean: 0.04,
      inflationGap: 0,
      inflationSensitivity: 0.1,
    };
    expect(goodsSpendingShare(base)).toBeCloseTo(0.8, 12);
    expect(goodsSpendingShare({ ...base, inflationSensitivity: 0, inflationGap: 0.1 })).toBeCloseTo(
      0.8,
      12,
    );
    expect(goodsSpendingShare({ ...base, inflationGap: 0.1 })).toBeCloseTo(0.81, 12);
    expect(goodsSpendingShare({ ...base, inflationGap: -0.05 })).toBeCloseTo(0.795, 12);
    expect(
      taylorRate({
        timePrefMean: 0.04,
        inflation: 0.12,
        inflationTarget: 0.02,
        inflationWeight: 1.5,
        outputWeight: 0,
        outputGap: 0,
      }),
    ).toBeCloseTo(0.04 + 0.12 + 1.5 * 0.1, 12);
  });
});
