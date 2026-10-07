import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { nextHousingPressure } from './housing.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'ai.ownerShareCeiling': 0,
};

describe('phase 21 housing market', () => {
  it('matches the formula prices when market clearing is off', () => {
    const prior = run(small);
    const neutral = run({ ...small, 'housing.marketClearing': 'off' });
    expect(prior.audit.ok && neutral.audit.ok).toBe(true);
    expect(series(neutral, 'priceHousing')).toEqual(series(prior, 'priceHousing'));
  });

  it('holds scarcity at one when demand is neutral and supply is flat', () => {
    expect(nextHousingPressure({ pressure: 1, demand: 0.55, supplyGrowthMonthly: 0 })).toBeCloseTo(
      1,
      12,
    );
    expect(
      nextHousingPressure({ pressure: 1, demand: 0.9, supplyGrowthMonthly: 0 }),
    ).toBeGreaterThan(1);
  });

  it('raises the relative housing price when households take mortgages', () => {
    const formula = run(small);
    const market = run({
      ...small,
      'housing.marketClearing': 'on',
      'housing.tenureChoice': 'on',
    });
    expect(formula.audit.ok && market.audit.ok).toBe(true);
    expect(relative(market)).toBeGreaterThan(relative(formula));
  });
});

function relative(result: SimulationResult): number {
  const housing = last(result, 'priceHousing');
  const cpi = last(result, 'priceLevel');
  return cpi > 0 ? housing / cpi : 0;
}

function run(input: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'phase21', seed: 2, ticks: 72, sliders: input }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
