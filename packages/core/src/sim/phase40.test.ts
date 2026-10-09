import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { FEATURE_OFF } from './feature-off.js';
import { simulate } from './simulate.js';

const base = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'regime.type': 'fiat',
  'centralBank.moneyGrowth': 1,
  ticks: 36,
};

describe('phase 40 money injection channel', () => {
  it('matches pro-rata deposits as the neutral channel', () => {
    const a = run({ ...base, 'centralBank.injectionChannel': 'proRataDeposits' });
    const b = run({ ...base });
    expect(series(a, 'moneySupply')).toEqual(series(b, 'moneySupply'));
  });

  it('changes wealth Gini when new money enters through government spending', () => {
    const proRata = run({ ...base, 'centralBank.injectionChannel': 'proRataDeposits', ticks: 60 });
    const fiscal = run({
      ...base,
      'centralBank.injectionChannel': 'governmentSpending',
      ticks: 60,
    });
    expect(series(fiscal, 'moneySupply').at(-1) ?? 0).toBeGreaterThan(
      series(fiscal, 'moneySupply')[0] ?? 0,
    );
    expect(series(fiscal, 'giniWealth').at(-1)).not.toEqual(series(proRata, 'giniWealth').at(-1));
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase40', seed: 3, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
