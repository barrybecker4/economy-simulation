import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import {
  creditBitcoin,
  foldBitcoinCash,
  markBitcoinToMarket,
  payFromCash,
} from './dual-currency.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';

describe('dual-currency value', () => {
  it('pays fiat first, then spends bitcoin at the current price', () => {
    const economy = economyWith();
    const household = economy.households[0];
    if (!household) {
      throw new Error('Missing household');
    }
    economy.bitcoinPrice = 50_000;
    household.deposit = 100;
    creditBitcoin(economy, household, 0.01);
    const carried = economy.bitcoinCarried;
    payFromCash(economy, household, 400, 0);
    expect(household.deposit).toBe(0);
    expect(household.bitcoin).toBeCloseTo(0.004, 8);
    expect(economy.bitcoinCarried).toBeCloseTo(carried - 0.006 * 50_000, 4);
  });

  it('seats a price move on bank equity and refreshes carried stocks', () => {
    const economy = economyWith();
    const household = economy.households[0];
    const bank = economy.banks[0];
    if (!household || !bank) {
      throw new Error('Missing actors');
    }
    economy.bitcoinPrice = 40_000;
    creditBitcoin(economy, household, 0.02);
    const equity = bank.equity;
    const residual = economy.privateEquity;
    economy.bitcoinPrice = 50_000;
    markBitcoinToMarket(economy);
    expect(economy.bitcoinCarried).toBeCloseTo(0.02 * 50_000, 6);
    expect(bank.equity + economy.privateEquity).toBeCloseTo(equity + residual, 6);
    expect(bank.equity).not.toBe(equity);
  });

  it('folds bitcoin cash back into the deposit at the current price', () => {
    const economy = economyWith();
    const household = economy.households[0];
    if (!household) {
      throw new Error('Missing household');
    }
    economy.bitcoinPrice = 25_000;
    household.deposit = 10;
    creditBitcoin(economy, household, 0.04);
    foldBitcoinCash(economy, household);
    expect(household.bitcoin).toBe(0);
    expect(household.deposit).toBeCloseTo(10 + 0.04 * 25_000, 6);
    expect(economy.bitcoinCarried).toBe(0);
  });
});

function economyWith() {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'dual-currency',
        seed: 1,
        ticks: 1,
        sliders: {
          'scale.households': 20,
          'scale.firms': 4,
          'scale.banks': 1,
          'shock.frequency': 0,
          'regime.type': 'hybrid',
        },
      }),
    ),
    1,
    null,
  );
}
