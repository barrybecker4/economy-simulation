import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
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
  'household.openingDepositMonths': 12,
};

describe('phase 34 residuals on the monetary preset', () => {
  it('raises unemployment after a negative productivity shock', () => {
    const calm = run({ ...monetary, 'regime.type': 'fiat', ticks: 36 });
    const adverse = run(
      { ...monetary, 'regime.type': 'fiat', ticks: 36 },
      { tick: 12, kind: 'productivity', size: -0.1 },
    );
    expect(mean(series(adverse, 'unemployment').slice(12, 24))).toBeGreaterThan(
      mean(series(calm, 'unemployment').slice(12, 24)),
    );
  });

  it('keeps unemployment near the natural rate with shocks off', () => {
    const result = run({ ...monetary, 'regime.type': 'fiat', ticks: 120 });
    const late = series(result, 'unemployment').slice(60);
    const natural = series(result, 'naturalUnemployment').slice(60);
    const gap = mean(late) - mean(natural);
    expect(Math.abs(gap)).toBeLessThan(0.08);
  });

  it('raises velocity when opening deposits are shorter', () => {
    const thick = run({
      ...monetary,
      'regime.type': 'fiat',
      'household.openingDepositMonths': 36,
      ticks: 36,
    });
    const thin = run({
      ...monetary,
      'regime.type': 'fiat',
      'household.openingDepositMonths': 12,
      ticks: 36,
    });
    expect(mean(series(thin, 'velocity'))).toBeGreaterThan(mean(series(thick, 'velocity')));
  });
});

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  shock?: { tick: number; kind: 'credit' | 'demand' | 'productivity'; size: number },
): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase34', seed: 2, ticks, sliders: rest }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}
