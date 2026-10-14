import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { totalDeposits } from './banking.js';
import { adjustBankEquity } from './capital-identity.js';
import { payHouseholdDepositInterest } from './deposit-interest.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { payFirmInterest } from './money.js';

describe('deposit-interest funding', () => {
  it('pays the coupon from firm interest collected this tick', () => {
    const economy = economyWith({ 'regime.type': 'bitcoin' });
    const bank = requireBank(economy);
    const firm = economy.firms[0];
    if (!firm) {
      throw new Error('Missing firm');
    }
    adjustBankEquity(bank, economy, 1_000_000);
    economy.policyRate = 0.04;
    firm.deposit = 500_000;
    const interest = 20_000;
    payFirmInterest(firm, bank, economy, interest);
    const borrowerInterest = new Map([[bank.id, interest]]);
    const equityBeforePay = bank.equity;
    payHouseholdDepositInterest(economy, borrowerInterest);
    expect(economy.depositInterestPaid).toBeGreaterThan(0);
    expect(economy.depositInterestPaid).toBeLessThanOrEqual(interest);
    expect(bank.equity).toBeCloseTo(equityBeforePay - economy.depositInterestPaid, 6);
  });

  it('does not pay interest on reserves under bitcoin', () => {
    const economy = economyWith({
      'regime.type': 'bitcoin',
      'bank.depositInterestSubsidy': 1,
    });
    const bank = requireBank(economy);
    bank.equity = 0;
    bank.failed = false;
    bank.reserves = 1_000_000;
    economy.policyRate = 0.05;
    payHouseholdDepositInterest(economy, new Map([[0, 0]]));
    expect(economy.reserveInterestPaid).toBe(0);
  });

  it('pays a hybrid fiat deposit at the fiat pass-through and posts that rate', () => {
    const economy = economyWith({
      'regime.type': 'hybrid',
      'bank.depositPassThrough': 1,
      'bank.fiatDepositPassThrough': 0.45,
    });
    const household = economy.households[0];
    const bank = household ? economy.banks[household.bank] : undefined;
    if (!household || !bank) {
      throw new Error('Missing household or bank');
    }
    for (const other of economy.households) {
      other.deposit = 0;
    }
    household.deposit = 120_000;
    household.bitcoin = 2.5;
    bank.failed = false;
    const coins = coinStock(economy);
    adjustBankEquity(bank, economy, 1_000_000);
    economy.policyRate = 0.04;
    const stockBefore = totalDeposits(economy);
    payHouseholdDepositInterest(economy, new Map([[bank.id, 1_000_000]]));
    // 120_000 cents × 0.45 × 0.04 / 12 = 180. The shared slider of 1 would pay 400.
    expect(economy.depositRate).toBeCloseTo(0.018, 10);
    expect(household.deposit).toBe(120_180);
    expect(economy.depositInterestPaid).toBe(180);
    expect(household.bitcoin).toBe(2.5);
    expect(coinStock(economy)).toEqual(coins);
    expect(economy.paidDepositRate).toBeCloseTo((180 * 12) / stockBefore, 8);
  });

  it('records reserve creations so money growth can net them out', () => {
    const economy = economyWith({
      'regime.type': 'fiat',
      'bank.depositInterestSubsidy': 1,
    });
    const bank = requireBank(economy);
    bank.equity = 0;
    bank.failed = false;
    economy.policyRate = 0.05;
    payHouseholdDepositInterest(economy, new Map([[0, 0]]));
    expect(economy.reserveInterestPaid).toBe(economy.depositInterestPaid);
    expect(economy.reserveInterestPaid).toBeGreaterThan(0);
  });
});

function economyWith(sliders: Record<string, number | string> = {}) {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'deposit-interest',
        seed: 1,
        ticks: 1,
        sliders: {
          'scale.households': 60,
          'scale.firms': 6,
          'scale.banks': 1,
          'shock.frequency': 0,
          'bank.depositPassThrough': 1,
          'household.openingDepositMonths': 12,
          ...sliders,
        },
      }),
    ),
    1,
    null,
  );
}

function coinStock(economy: ReturnType<typeof economyWith>): number[] {
  return [
    economy.govBitcoin,
    ...economy.households.map((household) => household.bitcoin),
    ...economy.firms.map((firm) => firm.bitcoin),
    ...economy.agents.map((agent) => agent.bitcoin),
  ];
}

function requireBank(economy: ReturnType<typeof economyWith>) {
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Missing bank');
  }
  return bank;
}
