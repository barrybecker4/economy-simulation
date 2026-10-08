import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { adjustBankEquity } from './capital-identity.js';
import { payHouseholdDepositInterest } from './deposit-interest.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
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
};

describe('phase 36 deposit interest pays the posted rate', () => {
  it('pays near the posted rate when the bank has equity', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase36-pay',
          seed: 1,
          ticks: 1,
          sliders: { ...monetary, 'regime.type': 'fiat' },
        }),
      ),
      1,
      null,
    );
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('Missing bank');
    }
    bank.failed = false;
    const cover = 1_000_000;
    adjustBankEquity(bank, economy, cover);
    economy.policyRate = 0.04;
    payHouseholdDepositInterest(economy, new Map([[0, cover]]));
    expect(economy.depositRate).toBeCloseTo(0.04, 8);
    expect(economy.depositInterestPaid).toBeGreaterThan(0);
  });

  it('covers a shortfall with the fiat subsidy up to the money-growth budget', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase36-subsidy',
          seed: 1,
          ticks: 1,
          sliders: {
            ...monetary,
            'regime.type': 'fiat',
            'bank.depositInterestSubsidy': 1,
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
    bank.equity = 0;
    bank.failed = false;
    economy.policyRate = 0.05;
    payHouseholdDepositInterest(economy, new Map([[0, 0]]));
    expect(economy.depositInterestPaid).toBeGreaterThan(0);
    expect(economy.reserveInterestPaid).toBe(economy.depositInterestPaid);
    // A 5 percent posted rate exceeds the ~3 percent steady-state growth budget,
    // so the subsidy cannot pay the full coupon.
    expect(economy.paidDepositRate).toBeLessThan(economy.depositRate);
  });

  it('matches phase 35 when pass-through is 0', () => {
    const none = run({
      ...monetary,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 0,
      ticks: 36,
    });
    const still = run({
      ...monetary,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 0,
      'bank.depositInterestSubsidy': 1,
      ticks: 36,
    });
    expect(series(none, 'moneySupply')[35]).toBeCloseTo(series(still, 'moneySupply')[35] ?? 0, 6);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase36', seed: 3, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
