import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import {
  monthlyMortgagePayment,
  monthlyOwnedCost,
  monthlyRentCost,
  tenureFromBurdens,
} from './contracts.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 29 housing user cost', () => {
  it('compares monthly rent, mortgage, and owned costs', () => {
    const price = 4800;
    const rent = monthlyRentCost(price);
    const owned = monthlyOwnedCost(price, 0.05);
    const mortgage = monthlyMortgagePayment(price * 0.8, 0.05, 30);
    expect(rent).toBeCloseTo(price * 0.007, 8);
    expect(owned).toBeGreaterThan(0);
    expect(mortgage).toBeGreaterThan(0);
    expect(tenureFromBurdens({ rent: 10, mortgage: 8, owned: 12 })).toBe('mortgage');
  });

  it('keeps a positive rent share and does not wipe deposits under bitcoin tenure', () => {
    const result = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.tenureChoice': 'on',
      ticks: 36,
    });
    expect(result.audit.ok).toBe(true);
    expect(series(result, 'auditOk').every((value) => value === 1)).toBe(true);
    const money = series(result, 'moneySupply');
    expect((money[1] ?? 0) / Math.max(money[0] ?? 1, 1)).toBeGreaterThan(0.9);
    expect(mean(series(result, 'rentShare'))).toBeGreaterThan(0);
  });

  it('shifts households out of mortgages under stronger expected deflation', () => {
    const mild = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.tenureChoice': 'on',
      'housing.adjustmentRate': 1,
      'deflation.sensitivity': 0,
      ticks: 60,
    });
    const sharp = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.tenureChoice': 'on',
      'housing.adjustmentRate': 1,
      'deflation.sensitivity': 5,
      ticks: 60,
    });
    expect(series(sharp, 'mortgageShare').at(-1) ?? 0).toBeLessThanOrEqual(
      series(mild, 'mortgageShare').at(-1) ?? 0,
    );
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase29', seed: 2, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}
