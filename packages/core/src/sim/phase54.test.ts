import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { onCentralBank } from './central-bank.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const monetary = {
  ...FEATURE_OFF,
  'scale.households': 40,
  'scale.firms': 4,
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
  'household.openingDepositMonths': 12,
};

describe('phase 54 smooth opening policy rate', () => {
  it('does not print both 0 and a rate above 10 percent in the opening months', () => {
    for (const regime of ['fiat', 'bitcoin'] as const) {
      const rates = series(
        run({ ...monetary, 'regime.type': regime, ticks: 7 }),
        'interestRate',
      ).slice(0, 7);
      const floored = rates.some((rate) => rate === 0);
      const spiked = rates.some((rate) => rate > 0.1);
      expect(floored && spiked, regime).toBe(false);
    }
  });

  it('lets a sustained inflation gap lift the published rate', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase54-gap',
          seed: 1,
          ticks: 1,
          sliders: { ...monetary, 'regime.type': 'fiat' },
        }),
      ),
      1,
      null,
    );
    const start = economy.policyRate;
    const prices = Array.from({ length: 13 }, (_, index) => 1.2 ** (index / 12));
    economy.priceHistory.splice(0, economy.priceHistory.length, ...prices);
    for (let step = 0; step < 36; step += 1) {
      onCentralBank(economy);
    }
    expect(economy.policyRate).toBeGreaterThan(start + 0.02);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 7, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase54', seed: 4, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
