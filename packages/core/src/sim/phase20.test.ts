import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { creditStressNext, endogenousBorrowing } from './credit.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 80,
  'scale.firms': 8,
  'scale.banks': 1,
  'shock.frequency': 0,
  'ai.ownerShareCeiling': 0,
};

describe('phase 20 endogenous credit and bond coupons', () => {
  it('matches the prior path when both sliders are zero', () => {
    const prior = run(small);
    const neutral = run({ ...small, 'credit.endogenousWeight': 0, 'government.bondRate': 0 });
    expect(prior.audit.ok && neutral.audit.ok).toBe(true);
    expect(series(neutral, 'creditToGdp')).toEqual(series(prior, 'creditToGdp'));
    expect(series(neutral, 'interestPaid')).toEqual(series(prior, 'interestPaid'));
  });

  it('stops new borrowing once stress is high and builds stress from leverage', () => {
    expect(endogenousBorrowing({ weight: 0, stress: 0, deposits: 100 })).toBe(0);
    expect(endogenousBorrowing({ weight: 1, stress: 0, deposits: 100 })).toBeCloseTo(12, 8);
    expect(endogenousBorrowing({ weight: 1, stress: 0.2, deposits: 100 })).toBe(0);
    expect(creditStressNext({ stress: 0, leverage: 0.01, lossRate: 0 })).toBe(0);
    expect(creditStressNext({ stress: 0, leverage: 0.5, lossRate: 0 })).toBeCloseTo(0.48, 8);
  });

  it('expands credit and later contracts it without an exogenous shock', () => {
    const result = run({ ...small, 'credit.endogenousWeight': 1 }, 180);
    expect(result.audit.ok).toBe(true);
    const credit = series(result, 'creditToGdp');
    const peak = Math.max(...credit);
    const peakAt = credit.indexOf(peak);
    expect(peak).toBeGreaterThan((credit[11] ?? 0) * 1.05);
    expect(credit[credit.length - 1] ?? 0).toBeLessThan(peak);
    expect(peakAt).toBeGreaterThan(11);
    expect(peakAt).toBeLessThan(credit.length - 1);
  });

  it('pays a coupon on government bonds and keeps the ledger balanced', () => {
    const quiet = run({
      ...small,
      'tax.incomeRate': 0.05,
      'government.spendingShareOfGDP': 0.35,
      'government.bondRate': 0,
    });
    const paying = run({
      ...small,
      'tax.incomeRate': 0.05,
      'government.spendingShareOfGDP': 0.35,
      'government.bondRate': 0.08,
    });
    expect(quiet.audit.ok && paying.audit.ok).toBe(true);
    expect(last(paying, 'interestPaid')).toBeGreaterThan(last(quiet, 'interestPaid'));
  });
});

function run(input: Record<string, number | string>, ticks = 72): SimulationResult {
  return simulate(loadScenario({ name: 'phase20', seed: 2, ticks, sliders: input }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
