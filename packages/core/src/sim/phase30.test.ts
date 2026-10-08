import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { marketLoanRate } from './central-bank.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 30 rates that match cash', () => {
  it('sets the bitcoin loan rate as a level around time preference', () => {
    expect(marketLoanRate({ timePrefMean: 0.04, loans: 100, savings: 100 })).toBeCloseTo(0.04, 8);
    expect(marketLoanRate({ timePrefMean: 0.04, loans: 200, savings: 100 })).toBeGreaterThan(0.04);
    expect(marketLoanRate({ timePrefMean: 0.04, loans: 0, savings: 100 })).toBeLessThan(0.04);
  });

  it('keeps a positive bitcoin interest rate when loans are near savings', () => {
    const result = run({
      ...small,
      'regime.type': 'bitcoin',
      'credit.endogenousWeight': 1,
      ticks: 48,
    });
    expect(result.audit.ok).toBe(true);
    const rates = series(result, 'interestRate');
    expect(Math.max(...rates)).toBeGreaterThan(0);
  });

  it('cuts discretionary spending when pass-through pays a higher deposit yield', () => {
    const none = run({
      ...small,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 0,
      'household.realReturnSensitivity': 5,
      'centralBank.inflationTarget': 0,
      ticks: 36,
    });
    const passed = run({
      ...small,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 1,
      'household.realReturnSensitivity': 5,
      'centralBank.inflationTarget': 0,
      ticks: 36,
    });
    expect(mean(series(passed, 'householdGoodsSpend'))).toBeLessThanOrEqual(
      mean(series(none, 'householdGoodsSpend')),
    );
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase30', seed: 2, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}
