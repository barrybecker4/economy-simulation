import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { onContractChoice } from './contracts.js';
import { desiredCapital, onCredit } from './credit.js';
import {
  bitcoinDepositUnits,
  creditBitcoin,
  creditBitcoinLoan,
  debitBitcoin,
} from './dual-currency.js';
import type { Economy } from './economy.js';
import { FEATURE_OFF } from './feature-off.js';
import { swapAtResidual, syncHybridCustody } from './hybrid-money.js';
import { transferCurrency } from './hybrid-settle.js';
import { createEconomy } from './init.js';
import { repayFirmLoan } from './money.js';
import { loadParameters } from './parameters.js';
import type { Firm, Household } from './types.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 20,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
  'regime.type': 'hybrid' as const,
};

describe('hybrid debt service', () => {
  it('collects a coin mortgage payment instead of forgiving the principal', () => {
    const economy = open();
    const household = requireHousehold(economy);
    const price = economy.bitcoinPrice;
    economy.policyRate = 0;
    setCoins(economy, household, 50 / price);
    household.deposit = 0;
    household.mortgage = 0;
    household.bitcoinMortgage = 200 / price;
    household.consumerLoan = 0;
    household.bitcoinConsumer = 0;
    household.mortgagePayment = 100;
    household.mortgageArrears = 0;
    household.mortgageIndexed = false;
    household.tenure = 'mortgage';
    const cashBefore = household.bitcoin * price;
    const debtBefore = household.bitcoinMortgage * price;

    onContractChoice(economy);

    const cashAfter = household.deposit + household.bitcoin * price;
    const debtAfter = household.bitcoinMortgage * price;
    expect(household.deposit).toBe(0);
    expect(cashBefore - cashAfter).toBeCloseTo(debtBefore - debtAfter, 6);
    expect(debtBefore - debtAfter).toBeCloseTo(50, 6);
  });

  it('repays a fiat firm loan without writing down a coin loan', () => {
    const economy = open();
    const firm = requireFirm(economy);
    const price = economy.bitcoinPrice;
    clearFirmCash(economy, firm);
    firm.loan = 1_000;
    firm.deposit = 1_000;
    creditBitcoinLoan(economy, firm, 2);
    const paid = repayFirmLoan(firm, 400, economy);
    expect(paid).toBe(400);
    expect(firm.loan).toBe(600);
    expect(firm.deposit).toBe(600);
    expect(firm.bitcoinLoan).toBeCloseTo(2, 8);
    expect(firm.bitcoin * price).toBeCloseTo(0, 6);
  });

  it('does not forgive the unpaid part of a coin firm loan', () => {
    const economy = open();
    const firm = requireFirm(economy);
    const price = economy.bitcoinPrice;
    clearFirmCash(economy, firm);
    firm.loan = 0;
    firm.deposit = 0;
    creditBitcoin(economy, firm, 1);
    creditBitcoinLoan(economy, firm, 5);
    const paid = repayFirmLoan(firm, 5 * price, economy);
    expect(paid).toBeCloseTo(price, 4);
    expect(firm.bitcoin).toBeCloseTo(0, 8);
    expect(firm.bitcoinLoan).toBeCloseTo(4, 8);
    expect(firm.deposit).toBe(0);
  });

  it('pays coin-loan interest from the coin till', () => {
    const economy = open();
    const firm = requireFirm(economy);
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('missing bank');
    }
    economy.policyRate = 0.04;
    const capital = desiredCapital(economy);
    for (const each of economy.firms) {
      each.capital = capital;
      each.loan = 0;
      each.bitcoinLoan = 0;
    }
    clearFirmCash(economy, firm);
    creditBitcoin(economy, firm, 0.01);
    creditBitcoinLoan(economy, firm, 0.01);
    const coins = firm.bitcoin;
    onCredit(economy);
    expect(economy.interestPaid).toBeGreaterThan(0);
    expect(firm.bitcoin).toBeLessThan(coins);
    expect(firm.bitcoinLoan).toBeCloseTo(0.01, 8);
    expect(bank.failed).toBe(false);
  });
});

describe('hybrid settlement', () => {
  it('does not mint exchange coins when a sale rounds past the coin value', () => {
    const economy = open();
    const household = requireHousehold(economy);
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('missing bank');
    }
    clearCoins(economy, household);
    economy.bitcoinPrice = 100;
    creditBitcoin(economy, household, 0.015);
    household.deposit = 0;
    const exchange = economy.exchangeBitcoin;
    const units = household.bitcoin;
    swapAtResidual(economy, household, -1.5);
    expect(household.deposit).toBe(1);
    expect(household.bitcoin).toBeCloseTo(units - 0.01, 8);
    expect(economy.exchangeBitcoin - exchange).toBeCloseTo(0.01, 8);
    expect(bank.reserves).toBeGreaterThan(0);
  });

  it('does not pay the payee in bitcoin the payer could not hand over', () => {
    const economy = open();
    const payer = requireHousehold(economy);
    const payee = economy.households[1];
    if (!payee) {
      throw new Error('missing payee');
    }
    clearCoins(economy, payer);
    clearCoins(economy, payee);
    economy.exchangeBitcoin = 0;
    const units = bitcoinDepositUnits(economy);
    const deposit = payer.deposit;
    transferCurrency(economy, payer, payee, 500, 'bitcoin');
    expect(payee.bitcoin).toBe(0);
    expect(payer.deposit).toBe(deposit);
    expect(bitcoinDepositUnits(economy)).toBeCloseTo(units, 8);
  });
});

function open(): Economy {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'hybrid-service',
        seed: 3,
        ticks: 1,
        sliders: {
          ...small,
          'housing.tenureChoice': 'on',
          'housing.adjustmentRate': 0,
          'housing.consumerCreditLimit': 0,
        },
      }),
    ),
    3,
    null,
  );
}

function requireHousehold(economy: Economy): Household {
  const household = economy.households[0];
  if (!household) {
    throw new Error('missing household');
  }
  return household;
}

function requireFirm(economy: Economy): Firm {
  const firm = economy.firms[0];
  if (!firm) {
    throw new Error('missing firm');
  }
  return firm;
}

function clearCoins(economy: Economy, account: { bitcoin: number }): void {
  if (account.bitcoin > 0) {
    debitBitcoin(economy, account, account.bitcoin);
  }
}

function clearFirmCash(economy: Economy, firm: Firm): void {
  clearCoins(economy, firm);
  firm.deposit = 0;
  firm.loan = 0;
  firm.bitcoinLoan = 0;
}

function setCoins(economy: Economy, account: { bitcoin: number }, units: number): void {
  clearCoins(economy, account);
  if (units > 0) {
    creditBitcoin(economy, account, units);
  }
  syncHybridCustody(economy);
}
