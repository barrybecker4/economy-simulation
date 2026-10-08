import { describe, expect, it } from 'vitest';
import { productionCapacity } from './capacity.js';
import { taylorRate } from './central-bank.js';
import { hurdleInvestment } from './credit.js';
import { deflationPenaltyFrom } from './helpers.js';
import { hiringScale, wageGrowth } from './labor.js';
import { monthlyPriceMove } from './pricing.js';
import {
  adoptionProgress,
  automationShare,
  computeAdoptionFactor,
  ownerSlotCount,
  roboticsProgress,
  scheduledAgentCount,
  taskGain,
} from './population.js';
import { AI_INTERNET_TASK_GAIN } from './rules.js';
import { goodsBudget, goodsSpendingShare } from './spending.js';

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
      humanWeight: 1,
    });
    expect(capacity).toBeCloseTo(8 ** 0.5 * 2 ** 0.5, 12);
  });

  it('puts the automatable share at the midpoint halfway through', () => {
    expect(automationShare(0.1, 0.9, 0.4, 10, 10)).toBeCloseTo(0.5, 12);
    expect(adoptionProgress(0.1, 0.9, 0.4, 10, 10)).toBeCloseTo(0.5, 12);
    expect(automationShare(0.3, 0.3, 1, 10, 20)).toBe(0.3);
    expect(adoptionProgress(0.3, 0.3, 1, 10, 20)).toBe(0);
    expect(ownerSlotCount(1000, 0.95, 0.5)).toBe(475);
    expect(scheduledAgentCount(475, 20, 0.5)).toBe(4750);
  });

  it('ramps adopted tasks as compute falls below the wage', () => {
    expect(computeAdoptionFactor(100, 100)).toBe(0);
    expect(computeAdoptionFactor(100, 110)).toBe(0);
    expect(computeAdoptionFactor(100, 70)).toBeCloseTo(0.3, 12);
    expect(computeAdoptionFactor(100, 0)).toBe(1);
  });

  it('scales the task gain with bullishness and retires the physical share on a ramp', () => {
    expect(taskGain(0, 10)).toBeCloseTo(AI_INTERNET_TASK_GAIN, 12);
    expect(taskGain(1, 10)).toBeCloseTo(1, 12);
    expect(taskGain(2, 10)).toBeCloseTo(Math.exp(0.15 * 10), 12);
    expect(roboticsProgress(7, 8, 12)).toBe(0);
    expect(roboticsProgress(8, 8, 12)).toBe(0);
    expect(roboticsProgress(14, 8, 12)).toBeCloseTo(0.5, 12);
    expect(roboticsProgress(20, 8, 12)).toBe(1);
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

  it('scales hiring down when the real wage is above its cost reference', () => {
    expect(hiringScale({ realWage: 2, referenceRealWage: 1, elasticity: 0 })).toBe(1);
    expect(hiringScale({ realWage: 1.1, referenceRealWage: 1, elasticity: 1 })).toBeCloseTo(
      0.9,
      12,
    );
  });

  it('moves a price with the trend when cost and demand are neutral', () => {
    expect(
      monthlyPriceMove({
        price: 100,
        unitCost: 100,
        markup: 0,
        pressure: 1,
        priceSpeed: 1,
        trend: 0.01,
        excessDemand: 0,
        trendWeight: 1,
        demandImpulse: 0,
        productivityImpulse: 0,
      }),
    ).toBeCloseTo(0.01, 12);
  });

  it('records the uninstalled three quarters as profit-sharing finance', () => {
    expect(hurdleInvestment(100, true)).toEqual({
      installed: 100,
      loanPath: 100,
      profitSharing: 0,
    });
    expect(hurdleInvestment(100, false)).toEqual({ installed: 25, loanPath: 0, profitSharing: 75 });
    expect(hurdleInvestment(0, false)).toEqual({ installed: 0, loanPath: 0, profitSharing: 0 });
  });

  it('cuts only the discretionary goods budget when the real return is positive', () => {
    const input = {
      smoothed: 100,
      income: 0,
      deposit: 0,
      spendingShare: 0.8,
      demandFactor: 1,
      realReturn: 0.1,
      realReturnSensitivity: 0,
      floorShare: 0.5,
    };
    expect(goodsBudget(input)).toBeCloseTo(80, 12);
    expect(goodsBudget({ ...input, realReturnSensitivity: 5 })).toBeCloseTo(60, 12);
  });
});
