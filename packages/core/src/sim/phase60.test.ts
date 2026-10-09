import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { createEconomy } from './init.js';
import { onPopulation } from './population.js';
import { loadParameters } from './parameters.js';
import { gini } from './stats.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const monetary = {
  ...FEATURE_OFF,
  'scale.households': 80,
  'scale.firms': 8,
  'scale.banks': 1,
  'shock.frequency': 0,
  'prices.trendWeight': 0,
  'production.demandWeight': 1,
  'bank.depositPassThrough': 1,
  'expectations.anchorWeight': 0.5,
  'housing.tenureChoice': 'on',
  'credit.endogenousWeight': 1,
  'credit.leverageStart': 1,
  'credit.householdMortgageShare': 0.25,
  'housing.mortgageLtv': 0.95,
  'bank.capitalRatio': 0.04,
  'bank.resolution': 'merge',
  'household.openingDepositMonths': 12,
  'household.skillSigma': 1.1,
  'regime.type': 'fiat',
};

describe('phase 60 inequality and velocity', () => {
  it('does not flatten wealth when a skill-weighted estate is paid', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase60-bequest',
          seed: 3,
          ticks: 1,
          sliders: {
            'scale.households': 40,
            'scale.firms': 4,
            'scale.banks': 1,
            'population.bequests': 'skillWeighted',
          },
        }),
      ),
      3,
      null,
    );
    const last = economy.households.at(-1);
    if (!last) {
      throw new Error('Missing household');
    }
    last.deposit = 80_000;
    const before = gini(economy.households.map((household) => household.deposit));
    economy.params.popGrowth = -0.5;
    onPopulation(economy);
    const after = gini(economy.households.map((household) => household.deposit));
    expect(after).toBeGreaterThanOrEqual(before - 0.01);
  });

  it('opens the monetary preset richer at the top and faster than the slow baseline', () => {
    const preset = run(monetary);
    const slow = run({
      'scale.households': 80,
      'scale.firms': 8,
      'scale.banks': 1,
      'shock.frequency': 0,
      'regime.type': 'fiat',
      ticks: 24,
    });
    expect(preset.audit.ok && slow.audit.ok).toBe(true);
    const wealth = end(preset, 'giniWealth');
    const top = end(preset, 'topDecileWealthShare');
    expect(wealth, `gini ${wealth} top ${top}`).toBeGreaterThan(0.6);
    expect(top).toBeGreaterThan(0.36);
    expect(mean(series(preset, 'velocity'))).toBeGreaterThan(0.018);
    expect(mean(series(slow, 'velocity'))).toBeLessThan(mean(series(preset, 'velocity')));
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 24, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase60', seed: 4, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function end(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}
