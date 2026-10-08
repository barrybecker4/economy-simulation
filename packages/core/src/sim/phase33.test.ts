import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { creditStressNext } from './credit.js';
import { simulate } from './simulate.js';

const monetary = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'prices.trendWeight': 0,
  'production.demandWeight': 1,
  'bank.depositPassThrough': 1,
  'expectations.anchorWeight': 0.5,
  'housing.tenureChoice': 'on',
  'credit.endogenousWeight': 1,
  'credit.leverageStart': 1,
  'bank.capitalRatio': 0.04,
};

describe('phase 33 credit stock and foreclosure', () => {
  it('builds stress only above the configured leverage start', () => {
    expect(
      creditStressNext({ stress: 0, leverage: 0.5, lossRate: 0, leverageStart: 0.8 }),
    ).toBe(0);
    expect(
      creditStressNext({ stress: 0, leverage: 1.0, lossRate: 0, leverageStart: 0.8 }),
    ).toBeCloseTo(0.2, 8);
  });

  it('raises credit to GDP above the single-digit range on the monetary preset', () => {
    const result = run({ ...monetary, 'regime.type': 'fiat', ticks: 180 });
    expect(result.audit.ok).toBe(true);
    const peak = Math.max(...series(result, 'creditToGdp'));
    expect(peak).toBeGreaterThan(0.08);
  });

  it('cuts goods spending when pass-through pays deposit interest', () => {
    const none = run({
      ...monetary,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 0,
      'household.realReturnSensitivity': 5,
      'centralBank.inflationTarget': 0,
      ticks: 60,
    });
    const full = run({
      ...monetary,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 1,
      'household.realReturnSensitivity': 5,
      'centralBank.inflationTarget': 0,
      ticks: 60,
    });
    expect(mean(series(full, 'householdGoodsSpend'))).toBeLessThanOrEqual(
      mean(series(none, 'householdGoodsSpend')),
    );
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase33', seed: 2, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}
