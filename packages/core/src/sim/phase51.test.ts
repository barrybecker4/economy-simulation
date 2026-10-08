import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { equityFor, loansAt } from './banking.js';
import { adjustBankEquity } from './capital-identity.js';
import { payHouseholdDepositInterest } from './deposit-interest.js';
import { createEconomy } from './init.js';
import { subsidizeDepositInterest } from './money.js';
import { loadParameters } from './parameters.js';
import { moneyAmount } from './helpers.js';
import { simulate } from './simulate.js';

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
  'bank.capitalRatio': 0.04,
  'household.openingDepositMonths': 12,
  'bank.resolution': 'off',
};

describe('phase 51 deposit interest is a flow', () => {
  it('pays the posted coupon from borrower interest and keeps the capital buffer', () => {
    const economy = economyWith({ ...monetary, 'regime.type': 'bitcoin' });
    const bank = requireBank(economy);
    const target = equityFor(economy, loansAt(economy, bank.id));
    const cover = 10_000_000;
    adjustBankEquity(bank, economy, cover);
    economy.policyRate = 0.04;
    payHouseholdDepositInterest(economy, new Map([[bank.id, cover]]));
    expect(economy.depositInterestPaid).toBeGreaterThanOrEqual(householdCoupon(economy) * 0.9);
    expect(bank.equity).toBeGreaterThanOrEqual(target);
  });

  it('does not spend the capital buffer when loan interest is short', () => {
    const economy = economyWith({ ...monetary, 'regime.type': 'bitcoin' });
    const bank = requireBank(economy);
    const before = bank.equity;
    adjustBankEquity(bank, economy, 50);
    economy.policyRate = 0.05;
    payHouseholdDepositInterest(economy, new Map([[bank.id, 50]]));
    expect(economy.depositInterestPaid).toBeLessThanOrEqual(50);
    expect(bank.equity).toBeCloseTo(before, 6);
  });

  it('does not wipe banks in the opening year when deposit interest is paid', () => {
    for (const regime of ['fiat', 'bitcoin'] as const) {
      const result = run({ ...monetary, 'regime.type': regime, ticks: 18 });
      expect(series(result, 'bankFailures').every((value) => value === 0)).toBe(true);
    }
    const fiat = run({ ...monetary, 'regime.type': 'fiat', ticks: 120 });
    expect(series(fiat, 'bankFailures').every((value) => value === 0)).toBe(true);
    expect(series(fiat, 'auditOk').every((value) => value === 1)).toBe(true);
  });

  it('keeps vault equal to equity plus private equity when the subsidy binds', () => {
    const economy = economyWith({
      ...monetary,
      'regime.type': 'fiat',
      'bank.depositInterestSubsidy': 1,
    });
    const bank = requireBank(economy);
    const vault = bank.vault;
    subsidizeDepositInterest(bank, economy, 500);
    expect(bank.vault).toBe(vault);
    expect(bank.vault).toBe(bank.equity + economy.privateEquity);
  });

  it('finishes S0, S3, and monetary fiat when the subsidy and pass-through bind', () => {
    const bound = {
      'regime.type': 'fiat' as const,
      'bank.depositPassThrough': 1,
      'bank.depositInterestSubsidy': 1,
      'shock.frequency': 0,
      ticks: 12,
    };
    for (const sliders of [
      bound,
      { ...bound, 'prices.trendWeight': 0, 'production.demandWeight': 1 },
      { ...monetary, ...bound },
    ]) {
      const result = run(sliders);
      expect(series(result, 'auditOk').every((value) => value === 1)).toBe(true);
    }
    const inactive = run({
      'regime.type': 'fiat',
      'bank.depositPassThrough': 0,
      'bank.depositInterestSubsidy': 1,
      'shock.frequency': 0,
      ticks: 4,
    });
    expect(series(inactive, 'auditOk').every((value) => value === 1)).toBe(true);
  });

  it('keeps S3 fiat inflation under 10 percent when the subsidy and pass-through bind', () => {
    const result = run({
      ...monetary,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 1,
      'bank.depositInterestSubsidy': 1,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);
    expect(series(result, 'inflation').at(-1) ?? 0).toBeLessThan(0.1);
  });
});

function householdCoupon(economy: ReturnType<typeof economyWith>): number {
  const monthly = economy.depositRate / 12;
  let coupon = 0;
  for (const household of economy.households) {
    if (household.deposit <= 0) {
      continue;
    }
    coupon += moneyAmount(economy, household.deposit * monthly);
  }
  return coupon;
}

function economyWith(sliders: Record<string, number | string>) {
  return createEconomy(
    loadParameters(loadScenario({ name: 'phase51', seed: 1, ticks: 1, sliders })),
    1,
    null,
  );
}

function requireBank(economy: ReturnType<typeof economyWith>) {
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Missing bank');
  }
  return bank;
}

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase51-run', seed: 1, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
