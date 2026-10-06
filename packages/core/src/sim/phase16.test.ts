import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 16 inflation time preference', () => {
  it('keeps spending deterministic when the inflation response is off', () => {
    const first = run({ ...small, 'household.inflationTimePreference': 0 });
    const second = run({ ...small, 'household.inflationTimePreference': 0 });
    expect(first.audit.ok && second.audit.ok).toBe(true);
    expect(series(first, 'householdGoodsSpend')).toEqual(series(second, 'householdGoodsSpend'));
    expect(series(first, 'interestRate')).toEqual(series(second, 'interestRate'));
  });

  it('raises goods spending more when the inflation response is on and inflation is above target', () => {
    const off = run({
      ...small,
      'labor.wageElasticity': 0,
      'household.inflationTimePreference': 0,
      'prices.trendWeight': 0,
      ticks: 36,
      shock: { tick: 12, kind: 'demand' as const, size: 0.3 },
    });
    const on = run({
      ...small,
      'labor.wageElasticity': 0,
      'household.inflationTimePreference': 0.5,
      'prices.trendWeight': 0,
      ticks: 36,
      shock: { tick: 12, kind: 'demand' as const, size: 0.3 },
    });
    expect(off.audit.ok && on.audit.ok).toBe(true);
    const lateInflation = mean(series(on, 'inflation').slice(24));
    expect(lateInflation).toBeGreaterThan(0.02);
    const offSpend = mean(series(off, 'householdGoodsSpend').slice(24));
    const onSpend = mean(series(on, 'householdGoodsSpend').slice(24));
    expect(onSpend).toBeGreaterThan(offSpend);
  });
});

function run(
  input: Record<string, number | string | object | undefined> & {
    ticks?: number;
    shock?: { tick: number; kind: 'credit' | 'demand' | 'productivity'; size: number };
  },
): SimulationResult {
  const { ticks = 48, shock, ...rest } = input;
  const sliders: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'number' || typeof value === 'string') {
      sliders[key] = value;
    }
  }
  return simulate(loadScenario({ name: 'phase16', seed: 2, ticks, sliders }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
