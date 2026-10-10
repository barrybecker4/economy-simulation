import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { issueBonds } from './bank-books.js';
import { placeInjection, withdrawInjection } from './central-bank.js';
import type { Economy } from './economy.js';
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
  'regime.type': 'fiat',
};

describe('phase 56 injection channels', () => {
  it('books loans within credit room, buys existing bonds, and spends treasury cash on inventory', () => {
    const loans = economy('newLoans');
    const assets = economy('assetPurchase');
    issueBonds(assets, 5_000);
    const fiscal = economy('governmentSpending');
    const beforeLoans = firmLoans(loans);
    const beforeBonds = bonds(assets);
    const beforeReserves = reserves(loans);
    const beforeTreasury = fiscal.govDeposits;
    const beforeHouseholds = householdDeposits(assets);
    const beforeFiscalFirms = firmDeposits(fiscal);
    placeInjection(loans, 4_000);
    placeInjection(assets, 4_000);
    placeInjection(fiscal, 4_000);
    expect(firmLoans(loans) - beforeLoans).toBeGreaterThan(0);
    expect(firmLoans(loans) - beforeLoans).toBeLessThanOrEqual(4_000);
    expect(reserves(loans)).toBe(beforeReserves);
    expect(bonds(assets)).toBe(beforeBonds - 4_000);
    expect(householdDeposits(assets)).toBe(beforeHouseholds + 4_000);
    expect(firmDeposits(fiscal) + fiscal.govDeposits).toBe(
      beforeFiscalFirms + beforeTreasury + 4_000,
    );
    expect(firmLoans(loans)).not.toBe(firmLoans(assets));
  });

  it('withdraws a new-loan contraction from firm balances', () => {
    const state = economy('newLoans');
    placeInjection(state, 4_000);
    const households = householdDeposits(state);
    const firms = firmDeposits(state);
    const loans = firmLoans(state);
    const removed = withdrawInjection(state, Math.min(1_000, loans));
    expect(removed).toBeGreaterThan(0);
    expect(householdDeposits(state)).toBe(households);
    expect(firmDeposits(state)).toBe(firms - removed);
    expect(firmLoans(state)).toBe(loans - removed);
  });

  it('does not let an S3 new-loan injection run away, and leaves spendNewMoney tame', () => {
    const s3 = {
      ...monetary,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      ticks: 120,
    };
    const loans = run({ ...s3, 'centralBank.injectionChannel': 'newLoans' });
    const hoarding = run({
      ...s3,
      'centralBank.injectionChannel': 'newLoans',
      'household.realReturnSensitivity': 3,
    });
    const spent = run({
      ...s3,
      'centralBank.injectionChannel': 'proRataDeposits',
      'centralBank.spendNewMoney': 1,
    });
    expect(loans.audit.ok && hoarding.audit.ok && spent.audit.ok).toBe(true);
    expect(series(loans, 'inflation').at(-1) ?? 0).toBeLessThan(0.1);
    expect(series(hoarding, 'inflation').at(-1) ?? 0).toBeLessThan(0.15);
    expect(series(hoarding, 'medianRealConsumption').at(-1) ?? 0).toBeGreaterThan(0.2);
    expect(series(spent, 'inflation').at(-1) ?? 0).toBeLessThan(0.1);
  });
});

function economy(channel: Economy['params']['injectionChannel']): Economy {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'phase56',
        seed: 1,
        ticks: 1,
        sliders: { ...monetary, 'centralBank.injectionChannel': channel },
      }),
    ),
    1,
    null,
  );
}

function firmLoans(state: Economy): number {
  return state.firms.reduce((sum, firm) => sum + firm.loan, 0);
}

function firmDeposits(state: Economy): number {
  return state.firms.reduce((sum, firm) => sum + firm.deposit, 0);
}

function householdDeposits(state: Economy): number {
  return state.households.reduce((sum, household) => sum + household.deposit, 0);
}

function bonds(state: Economy): number {
  return state.banks.reduce((sum, bank) => sum + bank.bonds, 0);
}

function reserves(state: Economy): number {
  return state.banks.reduce((sum, bank) => sum + bank.reserves, 0);
}

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase56-run', seed: 4, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
