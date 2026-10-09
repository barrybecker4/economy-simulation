import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { equityFor, loansAt } from './banking.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { releaseBankEquity } from './money.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';

describe('phase 73 bank dividends to depositors', () => {
  it('pays excess equity to depositors without touching vault', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase73-dividend',
          seed: 1,
          ticks: 1,
          sliders: {
            ...FEATURE_OFF,
            'scale.households': 20,
            'scale.firms': 4,
            'scale.banks': 1,
            'regime.type': 'fiat',
          },
        }),
      ),
      1,
      null,
    );
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('missing bank');
    }
    const target = equityFor(economy, loansAt(economy, bank.id));
    bank.equity = target + 1_000;
    economy.privateEquity = bank.vault - bank.equity;
    const vault = bank.vault;
    const depositsBefore = economy.households.reduce((sum, h) => sum + h.deposit, 0);
    releaseBankEquity(bank, economy, 1_000);
    expect(bank.vault).toBe(vault);
    expect(bank.equity).toBe(target);
    expect(bank.vault).toBeCloseTo(bank.equity + economy.privateEquity, 6);
    expect(economy.households.reduce((sum, h) => sum + h.deposit, 0)).toBe(depositsBefore + 1_000);
  });

  it('keeps pass-through-0 fiat money near the growth path instead of soaking into equity', () => {
    const result = run({
      ...FEATURE_OFF,
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
      'shock.frequency': 0,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 0,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);
    const money = series(result, 'moneySupply');
    const start = money[0] ?? 1;
    const end = money.at(-1) ?? 0;
    expect(end / start).toBeGreaterThan(0.85);
    expect(end / start).toBeLessThan(1.5);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase73', seed: 3, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
