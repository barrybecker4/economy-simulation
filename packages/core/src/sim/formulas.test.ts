import { describe, expect, it } from 'vitest';
import { productionCapacity } from './capacity.js';
import { taylorRate } from './central-bank.js';
import { hurdleInvestment } from './credit.js';
import { deflationPenaltyFrom } from './helpers.js';
import { agreedWage, hiringScale, wageGrowth } from './labor.js';
import { monthlyPriceMove } from './pricing.js';
import {
  adoptionProgress,
  automationShare,
  computeAdoptionFactor,
  humanTaskWeight,
  ownerSlotCount,
  roboticsProgress,
  scheduledAgentCount,
  subagentCount,
  taskGain,
} from './population.js';
import { AI_INTERNET_TASK_GAIN, TIGHTNESS_WAGE } from './rules.js';
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

  it('counts AI workers so zero humans still produce when automation is complete', () => {
    const base = {
      firmProductivity: 1,
      productivity: 1,
      productivityImpulse: 0,
      capital: 8,
      alpha: 0.5,
      laborStar: 4,
      automatedSeats: true,
    };
    expect(
      productionCapacity({ ...base, labor: 0, aiFactor: 1, humanWeight: 1 }),
    ).toBe(0);
    const automated = productionCapacity({
      ...base,
      labor: 0,
      aiFactor: 2,
      humanWeight: 1e-9,
    });
    expect(automated).toBeGreaterThan(0);
    expect(automated).toBeCloseTo(
      productionCapacity({ ...base, labor: 0, aiFactor: 1, humanWeight: 1e-9 }) * 2,
      10,
    );
    const staffed = productionCapacity({
      ...base,
      labor: 2,
      aiFactor: 1,
      humanWeight: 0.5,
    });
    const full = productionCapacity({
      ...base,
      labor: 4,
      aiFactor: 1,
      humanWeight: 1,
    });
    expect(staffed).toBeCloseTo(full, 12);
  });

  it('keeps the prior staffing path when automated seats are off', () => {
    const base = {
      firmProductivity: 1,
      productivity: 1,
      productivityImpulse: 0,
      capital: 8,
      alpha: 0.5,
      laborStar: 4,
      aiFactor: 1,
    };
    expect(productionCapacity({ ...base, labor: 0, humanWeight: 1e-9 })).toBe(0);
    const shrunk = productionCapacity({ ...base, labor: 2, humanWeight: 0.5 });
    const prior =
      1 *
      1 *
      8 ** 0.5 *
      4 ** 0.5 *
      (2 / (4 * 0.5)) ** ((1 - 0.5) * 0.5);
    expect(shrunk).toBeCloseTo(prior, 12);
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

  it('blends displacement with residual human tasks when labor replacement rises', () => {
    const adopted = 0.8;
    const gain = 1;
    const current = 1 / (1 + adopted * Math.min(gain, 1));
    expect(
      humanTaskWeight({ adopted, taskGain: gain, inForce: 0.9, laborReplacement: 0 }),
    ).toBeCloseTo(current, 12);
    expect(
      humanTaskWeight({ adopted, taskGain: gain, inForce: 1, laborReplacement: 1 }),
    ).toBeCloseTo(1e-9, 12);
    expect(
      humanTaskWeight({ adopted, taskGain: gain, inForce: 0.8, laborReplacement: 1 }),
    ).toBeCloseTo(0.2, 12);
    expect(
      humanTaskWeight({ adopted, taskGain: gain, inForce: 0.8, laborReplacement: 0.5 }),
    ).toBeCloseTo(0.5 * current + 0.5 * 0.2, 12);
    expect(
      humanTaskWeight({ adopted: 0, taskGain: 2, inForce: 0, laborReplacement: 1 }),
    ).toBe(1);
  });

  it('grows the subagent field along the adoption curve', () => {
    expect(subagentCount(1, 0)).toBe(1);
    expect(subagentCount(1, 1)).toBe(1);
    expect(subagentCount(1000, 0)).toBe(1);
    expect(subagentCount(1000, 0.5)).toBeCloseTo(500.5, 12);
    expect(subagentCount(1000, 1)).toBe(1000);
    expect(subagentCount(4, 1)).toBe(4);
  });

  it('puts Extreme labor replacement near the residual by year 4', () => {
    const years = 4;
    const start = 0.1;
    const end = 1;
    const steepness = 1.5;
    const midpoint = 1;
    const share = automationShare(start, end, steepness, midpoint, years);
    const span = share - start;
    const robotics = roboticsProgress(years, 0, 2);
    const reachable = 1 - 0 * (1 - robotics);
    const costFactor = computeAdoptionFactor(100, 100 * (1 - 0.6) ** years);
    const adopted = span * reachable * costFactor;
    const inForce = share * reachable * costFactor;
    const weight = humanTaskWeight({
      adopted,
      taskGain: taskGain(2, years),
      inForce,
      laborReplacement: 1,
    });
    expect(weight).toBeGreaterThan(0.02);
    expect(weight).toBeLessThan(0.05);
    expect(1 - 0.94 * weight).toBeGreaterThan(0.95);
  });

  it('closes shortfalls and excesses at the same rigidity speed', () => {
    const raise = wageGrowth({ posted: 100, agreed: 110, rigidity: 0.9 });
    const cut = wageGrowth({ posted: 100, agreed: 90, rigidity: 0.9 });
    expect(raise).toBeCloseTo(0.01, 12);
    expect(cut).toBeCloseTo(-0.01, 12);
    expect(wageGrowth({ posted: 100, agreed: 102, rigidity: 0 })).toBeCloseTo(0.02, 12);
    expect(wageGrowth({ posted: 100, agreed: 98, rigidity: 0 })).toBeCloseTo(-0.02, 12);
    expect(wageGrowth({ posted: 100, agreed: 110, rigidity: 0 })).toBeCloseTo(0.05, 12);
  });

  it('builds the agreed wage from price, productivity, and tightness', () => {
    expect(
      agreedWage({
        priceLevel: 120,
        markup: 0.2,
        productivity: 1.1,
        tightness: -0.1,
      }),
    ).toBeCloseTo(120 * (1 / 1.2) * 1.1 * (1 + TIGHTNESS_WAGE * -0.1), 12);
  });

  it('scales hiring from the agreed real wage', () => {
    expect(hiringScale({ realWage: 1.1, referenceRealWage: 1, elasticity: 0 })).toBe(1);
    expect(hiringScale({ realWage: 1.1, referenceRealWage: 1, elasticity: 0.5 })).toBeCloseTo(
      0.95,
      12,
    );
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
    ).toBeCloseTo(0.2, 12);
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
