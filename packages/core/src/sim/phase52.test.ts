import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { equityFor, loansAt } from './banking.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { resolveInsolventBanks } from './resolution.js';
import { simulate } from './simulate.js';
import type { Economy } from './economy.js';

const monetary = {
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
};

describe('phase 52 resolution once, every depositor', () => {
  it('cuts treasury deposits by the same share as household deposits', () => {
    const economy = soleBank();
    const bank = requireBank(economy);
    const household = economy.households[0];
    if (!household) {
      throw new Error('Missing household');
    }
    clearDeposits(economy);
    household.deposit = 1_000_000;
    economy.govDeposits = 1_000_000;
    bank.equity = -1_000;
    resolveInsolventBanks(economy);
    const householdCut = 1_000_000 - household.deposit;
    const treasuryCut = 1_000_000 - economy.govDeposits;
    expect(householdCut).toBeGreaterThan(0);
    expect(treasuryCut / 1_000_000).toBeCloseTo(householdCut / 1_000_000, 4);
    expect(bank.equity).toBeGreaterThanOrEqual(equityFor(economy, loansAt(economy, bank.id)));
  });

  it('restores the capital target once and does not bail in again', () => {
    const economy = soleBank();
    const bank = requireBank(economy);
    const before = economy.households[0]?.deposit ?? 0;
    bank.equity = -1_000;
    resolveInsolventBanks(economy);
    const target = equityFor(economy, loansAt(economy, bank.id));
    expect(bank.equity).toBeGreaterThanOrEqual(target);
    expect(bank.failed).toBe(false);
    expect(economy.cumulativeFailures).toBe(1);
    const equity = bank.equity;
    const deposit = economy.households[0]?.deposit;
    resolveInsolventBanks(economy);
    expect(economy.cumulativeFailures).toBe(1);
    expect(bank.equity).toBe(equity);
    expect(economy.households[0]?.deposit).toBe(deposit);
    expect(deposit).toBeLessThan(before);
  });

  it('leaves a positive hybrid bank alone after lender-of-last-resort support', () => {
    const economy = soleBank({ 'regime.type': 'hybrid' });
    const bank = requireBank(economy);
    const deposit = economy.households[0]?.deposit;
    bank.equity = 1;
    economy.lenderOfLastResortRan = true;
    resolveInsolventBanks(economy);
    expect(economy.cumulativeFailures).toBe(0);
    expect(economy.households[0]?.deposit).toBe(deposit);
  });

  it('bails in a hybrid bank only after support leaves equity negative', () => {
    const economy = soleBank({ 'regime.type': 'hybrid' });
    const bank = requireBank(economy);
    const before = economy.households[0]?.deposit ?? 0;
    bank.equity = -1_000;
    resolveInsolventBanks(economy);
    expect(bank.failed).toBe(false);
    expect(bank.equity).toBe(-1_000);
    expect(economy.households[0]?.deposit).toBe(before);
    economy.lenderOfLastResortRan = true;
    resolveInsolventBanks(economy);
    expect(bank.failed).toBe(false);
    expect(bank.equity).toBeGreaterThanOrEqual(equityFor(economy, loansAt(economy, bank.id)));
    expect(economy.households[0]?.deposit).toBeLessThan(before);
  });

  it('does not record a monthly bail-in loop on the monetary preset', () => {
    for (const regime of ['fiat', 'bitcoin'] as const) {
      const result = run({ ...monetary, 'regime.type': regime, ticks: 120 });
      expect(result.audit.ok).toBe(true);
      const failures = last(result, 'bankFailures');
      expect(failures).toBeLessThan(30);
      if (regime === 'fiat') {
        // Bitcoin's opening mortgage book already exceeds a quarter of household
        // deposits once the surplus is spent, so the savings cap admits no new
        // loan. Fiat lending does not use that cap.
        const borrowing = result.metrics.series.newBorrowing.slice(12);
        expect(borrowing.some((value) => (value ?? 0) > 0)).toBe(true);
      }
    }
  });

  it('keeps calm bitcoin broad money near the resolution-off path', () => {
    const off = run({
      ...monetary,
      'regime.type': 'bitcoin',
      'bank.resolution': 'off',
      ticks: 120,
    });
    const merge = run({ ...monetary, 'regime.type': 'bitcoin', ticks: 120 });
    expect(off.audit.ok && merge.audit.ok).toBe(true);
    const offEnd = last(off, 'moneySupply');
    const mergeEnd = last(merge, 'moneySupply');
    const losses = merge.metrics.series.defaults.reduce<number>(
      (total, value) => total + (value ?? 0),
      0,
    );
    // The same credit losses hit either setting. Bail-in moves them onto
    // deposits once. It does not keep writing deposits down every month.
    expect(mergeEnd).toBeGreaterThanOrEqual(offEnd - losses);
    expect(last(merge, 'bankFailures')).toBeLessThan(30);
  });
});

function soleBank(extra: Record<string, number | string> = {}): Economy {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'phase52',
        seed: 1,
        ticks: 1,
        sliders: {
          'scale.households': 40,
          'scale.firms': 4,
          'scale.banks': 1,
          'shock.frequency': 0,
          'bank.resolution': 'merge',
          'regime.type': 'fiat',
          ...extra,
        },
      }),
    ),
    1,
    null,
  );
}

function clearDeposits(economy: Economy): void {
  for (const household of economy.households) {
    household.deposit = 0;
  }
  for (const firm of economy.firms) {
    firm.deposit = 0;
  }
  for (const agent of economy.agents) {
    agent.deposit = 0;
  }
  economy.govDeposits = 0;
}

function requireBank(economy: Economy) {
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Missing bank');
  }
  return bank;
}

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase52-run', seed: 4, ticks, sliders: rest }));
}

function last(result: SimulationResult, id: MetricId): number {
  const values = result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
  return values[values.length - 1] ?? 0;
}
