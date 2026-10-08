import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { totalDeposits } from './banking.js';
import { growFiatMoney } from './central-bank.js';
import type { Economy } from './economy.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { bankBalanceIdentity } from './stocks.js';

/** Monetary preset. Seed 8 of a 20-seed run fails at tick 22 with these settings. */
const MONETARY_PRESET: Record<string, number | string> = {
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

describe('fiat money contraction', () => {
  it('draws reserves from later banks when the first bank cannot cover the contraction', () => {
    const economy = fiatEconomy();
    const household = economy.households[0];
    const first = economy.banks[0];
    const second = economy.banks[1];
    if (!household || !first || !second) {
      throw new Error('Need a household and two banks');
    }
    clearDeposits(economy);
    household.deposit = 100_000;
    first.reserves = 1_000;
    second.reserves = 20_000;
    const gap = bankBalanceIdentity(economy);

    growFiatMoney(economy);

    expect(totalDeposits(economy)).toBe(95_000);
    expect(first.reserves).toBe(0);
    expect(second.reserves).toBe(16_000);
    expect(bankBalanceIdentity(economy)).toBe(gap);
  });

  it('stops the contraction when bank reserves are used up', () => {
    const economy = fiatEconomy();
    const household = economy.households[0];
    const first = economy.banks[0];
    if (!household || !first) {
      throw new Error('Need a household and a bank');
    }
    clearDeposits(economy);
    household.deposit = 100_000;
    for (const bank of economy.banks) {
      bank.reserves = 0;
    }
    first.reserves = 1_000;
    const gap = bankBalanceIdentity(economy);

    growFiatMoney(economy);

    expect(totalDeposits(economy)).toBe(99_000);
    expect(first.reserves).toBe(0);
    expect(bankBalanceIdentity(economy)).toBe(gap);
  });

  it('keeps the monetary preset books closed through the reported month', () => {
    expect(() =>
      simulate(
        loadScenario({
          name: 'monetary',
          seed: 8,
          ticks: 23,
          sliders: MONETARY_PRESET,
        }),
      ),
    ).not.toThrow();
  });
});

function fiatEconomy(): Economy {
  const economy = createEconomy(
    loadParameters(
      loadScenario({
        name: 'contraction',
        seed: 1,
        ticks: 1,
        sliders: {
          'regime.type': 'fiat',
          'centralBank.moneyGrowth': 1,
          'scale.households': 20,
          'scale.firms': 4,
          'scale.banks': 2,
          'shock.frequency': 0,
        },
      }),
    ),
    1,
    null,
  );
  economy.priceHistory.splice(
    0,
    economy.priceHistory.length,
    ...Array.from({ length: 12 }, () => 1),
    2,
  );
  return economy;
}

function clearDeposits(economy: Economy): void {
  economy.govDeposits = 0;
  for (const household of economy.households) {
    household.deposit = 0;
  }
  for (const firm of economy.firms) {
    firm.deposit = 0;
  }
  for (const agent of economy.agents) {
    agent.deposit = 0;
  }
}
