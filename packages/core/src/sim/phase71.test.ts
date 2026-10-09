import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { issueBonds } from './bank-books.js';
import { placeInjection, taylorRate } from './central-bank.js';
import type { Economy } from './economy.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { MAX_POLICY_RATE } from './rules.js';
import { simulate } from './simulate.js';

const monetary = {
  ...FEATURE_OFF,
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
  'regime.type': 'fiat',
};

describe('phase 71 rate cap and real injection channels', () => {
  it('caps the raw Taylor rate at 20 percent', () => {
    expect(
      taylorRate({
        timePrefMean: 0.04,
        inflation: 0.5,
        inflationTarget: 0.02,
        inflationWeight: 1.5,
        outputWeight: 1,
        outputGap: 0.1,
      }),
    ).toBe(MAX_POLICY_RATE);
  });

  it('spends a government injection only against inventory and leaves the rest in the treasury', () => {
    const state = economy('governmentSpending');
    const beforeTreasury = state.govDeposits;
    const beforeFirms = firmDeposits(state);
    const beforeInventory = totalInventory(state);
    placeInjection(state, 50_000);
    expect(state.govDeposits).toBeGreaterThanOrEqual(beforeTreasury);
    expect(firmDeposits(state)).toBeGreaterThanOrEqual(beforeFirms);
    expect(totalInventory(state)).toBeLessThanOrEqual(beforeInventory);
    expect(state.govDeposits + firmDeposits(state)).toBeCloseTo(
      beforeTreasury + beforeFirms + 50_000,
      6,
    );
  });

  it('books new-loan injections only up to credit room and does not claw them back the same tick', () => {
    const state = economy('newLoans');
    const before = firmLoans(state);
    placeInjection(state, 1_000_000);
    const booked = firmLoans(state) - before;
    expect(booked).toBeGreaterThan(0);
    expect(booked).toBeLessThan(1_000_000);
    expect(state.channelLoans).toBe(booked);
  });

  it('buys only existing bonds under assetPurchase', () => {
    const empty = economy('assetPurchase');
    const beforeBonds = bonds(empty);
    const beforeHouseholds = householdDeposits(empty);
    placeInjection(empty, 4_000);
    expect(bonds(empty)).toBe(beforeBonds);
    expect(householdDeposits(empty)).toBe(beforeHouseholds);

    const funded = economy('assetPurchase');
    issueBonds(funded, 5_000);
    const openingBonds = bonds(funded);
    const openingHouseholds = householdDeposits(funded);
    const openingReserves = reserves(funded);
    placeInjection(funded, 4_000);
    expect(bonds(funded)).toBe(openingBonds - 4_000);
    expect(householdDeposits(funded)).toBe(openingHouseholds + 4_000);
    // QE swap replaces the bond; a second reserve leg matches new deposits.
    expect(reserves(funded)).toBe(openingReserves + 8_000);
  });

  it('keeps hoarding-channel unemployment near the other channels', () => {
    const shared = {
      ...monetary,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      'household.realReturnSensitivity': 3,
      ticks: 120,
    };
    const deposits = run({ ...shared, 'centralBank.injectionChannel': 'proRataDeposits' });
    const loans = run({ ...shared, 'centralBank.injectionChannel': 'newLoans' });
    const spending = run({ ...shared, 'centralBank.injectionChannel': 'governmentSpending' });
    expect(deposits.audit.ok && loans.audit.ok && spending.audit.ok).toBe(true);
    const uDeposits = mean(series(deposits, 'unemployment'));
    const uLoans = mean(series(loans, 'unemployment'));
    const uSpending = mean(series(spending, 'unemployment'));
    expect(Math.abs(uLoans - uDeposits)).toBeLessThan(0.08);
    expect(Math.abs(uSpending - uDeposits)).toBeLessThan(0.08);
    expect(peak(series(loans, 'interestRate'))).toBeLessThanOrEqual(MAX_POLICY_RATE + 0.01);
  });
});

function economy(channel: Economy['params']['injectionChannel']): Economy {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'phase71',
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

function totalInventory(state: Economy): number {
  return state.firms.reduce((sum, firm) => sum + firm.inventory, 0);
}

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase71-run', seed: 4, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function peak(values: number[]): number {
  return Math.max(...values, 0);
}
