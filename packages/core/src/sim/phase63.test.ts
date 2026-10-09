import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate, type ForcedShock } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 63 wage negotiation', () => {
  it('keeps calm unemployment near the natural rate in every regime', () => {
    for (const regime of ['fiat', 'bitcoin', 'hybrid'] as const) {
      const result = run({ ...small, 'regime.type': regime, ticks: 120 });
      expect(result.audit.ok).toBe(true);
      const unemployment = end(result, 'unemployment');
      const natural = end(result, 'naturalUnemployment');
      expect(Math.abs(unemployment - natural)).toBeLessThan(0.03);
    }
  });

  it('leaves employees behind under rising fiat prices when wages are sticky', () => {
    const sticky = run({
      ...small,
      'regime.type': 'fiat',
      'wage.nominalRigidity': 0.9,
      'prices.trendWeight': 1,
      ticks: 120,
    });
    const flexible = run({
      ...small,
      'regime.type': 'fiat',
      'wage.nominalRigidity': 0,
      'prices.trendWeight': 1,
      ticks: 120,
    });
    expect(end(sticky, 'realWage')).toBeLessThan(end(flexible, 'realWage'));
  });

  it('leaves employees ahead under demand-driven bitcoin deflation when wages are sticky', () => {
    const shock: ForcedShock = { tick: 12, kind: 'demand', size: -0.25 };
    const sticky = run(
      {
        ...small,
        'regime.type': 'bitcoin',
        'wage.nominalRigidity': 0.9,
        'prices.trendWeight': 0,
        'production.demandWeight': 1,
        ticks: 48,
      },
      shock,
    );
    const flexible = run(
      {
        ...small,
        'regime.type': 'bitcoin',
        'wage.nominalRigidity': 0,
        'prices.trendWeight': 0,
        'production.demandWeight': 1,
        ticks: 48,
      },
      shock,
    );
    const verySticky = run(
      {
        ...small,
        'regime.type': 'bitcoin',
        'wage.nominalRigidity': 0.95,
        'prices.trendWeight': 0,
        'production.demandWeight': 1,
        ticks: 48,
      },
      shock,
    );
    expect(at(sticky, 'realWage', 24)).toBeGreaterThan(at(flexible, 'realWage', 24));
    expect(moneyWage(sticky, 24)).toBeLessThan(moneyWage(sticky, 0));
    expect(peak(sticky, 'unemployment')).toBeGreaterThan(peak(flexible, 'unemployment'));
    expect(peak(sticky, 'unemployment')).toBeLessThan(peak(verySticky, 'unemployment'));
  });
});

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  shock?: ForcedShock,
): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase63', seed: 2, ticks, sliders: rest }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function end(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}

function at(result: SimulationResult, id: MetricId, tick: number): number {
  return result.metrics.series[id][tick] ?? 0;
}

function peak(result: SimulationResult, id: MetricId): number {
  return Math.max(...result.metrics.series[id].map((value) => value ?? 0));
}

function moneyWage(result: SimulationResult, tick: number): number {
  return at(result, 'realWage', tick) * at(result, 'priceLevel', tick);
}
