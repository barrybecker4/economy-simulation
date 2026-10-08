import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { resolveInsolventBanks } from './resolution.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 2,
  'shock.frequency': 0,
};

describe('phase 38 bank resolution', () => {
  it('merges a failed bank into a survivor and keeps deposits spendable', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase38-merge',
          seed: 1,
          ticks: 1,
          sliders: {
            ...small,
            'bank.resolution': 'merge',
            'regime.type': 'fiat',
          },
        }),
      ),
      1,
      null,
    );
    const failed = economy.banks[0];
    const survivor = economy.banks[1];
    if (!failed || !survivor) {
      throw new Error('Need two banks');
    }
    const moved = economy.households.filter((household) => household.bank === failed.id);
    const before = moved.reduce((sum, household) => sum + household.deposit, 0);
    failed.equity = -100;
    resolveInsolventBanks(economy);
    expect(failed.failed).toBe(true);
    expect(moved.every((household) => household.bank === survivor.id)).toBe(true);
    const after = moved.reduce((sum, household) => sum + household.deposit, 0);
    expect(after).toBe(before);
    expect(failed.equity).toBe(0);
    expect(failed.reserves).toBe(0);
  });

  it('bails in a sole bank until equity is positive', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase38-bailin',
          seed: 1,
          ticks: 1,
          sliders: {
            'scale.households': 40,
            'scale.firms': 4,
            'scale.banks': 1,
            'shock.frequency': 0,
            'bank.resolution': 'merge',
            'regime.type': 'fiat',
          },
        }),
      ),
      1,
      null,
    );
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('Missing bank');
    }
    bank.equity = -50_000;
    resolveInsolventBanks(economy);
    expect(bank.equity).toBeGreaterThan(0);
    expect(bank.failed).toBe(false);
  });

  it('leaves deposits stranded when resolution is off', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase38-off',
          seed: 1,
          ticks: 1,
          sliders: {
            ...small,
            'bank.resolution': 'off',
            'regime.type': 'fiat',
          },
        }),
      ),
      1,
      null,
    );
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('Missing bank');
    }
    const customers = economy.households.filter((household) => household.bank === bank.id);
    bank.equity = -10;
    resolveInsolventBanks(economy);
    expect(bank.failed).toBe(true);
    expect(customers.every((household) => household.bank === bank.id)).toBe(true);
  });

  it('keeps the ledger balanced with merge on the monetary preset', () => {
    const result = run({
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
      'credit.householdMortgageShare': 0.25,
      'housing.mortgageLtv': 0.95,
      'bank.capitalRatio': 0.04,
      'bank.resolution': 'merge',
      'household.openingDepositMonths': 12,
      'regime.type': 'fiat',
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);
    expect(series(result, 'auditOk').every((value) => value === 1)).toBe(true);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase38', seed: 4, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
