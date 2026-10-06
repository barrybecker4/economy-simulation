import { savingsStock, totalDeposits, totalLoans } from './banking.js';
import type { Economy } from './economy.js';
import { inflation, moneyAmount, outputGap } from './helpers.js';
import {
  addReserves,
  injectBankCapital,
  payDepositInterest as creditDepositInterest,
} from './money.js';

/** Taylor-style fiat policy rate. */
export function taylorRate(input: {
  timePrefMean: number;
  inflation: number;
  inflationTarget: number;
  inflationWeight: number;
  outputWeight: number;
  outputGap: number;
}): number {
  return Math.max(
    0,
    input.timePrefMean +
      input.inflation +
      input.inflationWeight * (input.inflation - input.inflationTarget) +
      input.outputWeight * input.outputGap,
  );
}

export function onCentralBank(economy: Economy): void {
  if (economy.params.regime === 'fiat') {
    setFiatPolicy(economy);
    accommodateReserves(economy);
  } else {
    setMarketRate(economy);
    if (economy.params.regime === 'hybrid') {
      supportInsolventBanks(economy);
    }
  }
  payDepositInterest(economy);
}

function setMarketRate(economy: Economy): void {
  const savings = savingsStock(economy);
  const pressure = savings > 0 ? totalLoans(economy) / savings - 1 : 0;
  economy.policyRate = Math.max(0, economy.policyRate + 0.05 * pressure);
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
}

function supportInsolventBanks(economy: Economy): void {
  for (const bank of economy.banks) {
    if (bank.equity < 0) {
      injectBankCapital(bank, -bank.equity + 1);
    }
  }
}

function setFiatPolicy(economy: Economy): void {
  economy.policyRate = taylorRate({
    timePrefMean: economy.params.timePrefMean,
    inflation: inflation(economy),
    inflationTarget: economy.params.inflationTarget,
    inflationWeight: economy.params.inflationWeight,
    outputWeight: economy.params.outputWeight,
    outputGap: outputGap(economy),
  });
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
}

function accommodateReserves(economy: Economy): void {
  const required = Math.round(economy.params.reserveRequirement * totalDeposits(economy));
  const reserves = economy.banks.reduce((sum, bank) => sum + bank.reserves, 0);
  if (reserves >= required) {
    return;
  }
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Reserve accommodation needs a bank');
  }
  addReserves(bank, required - reserves);
}

function payDepositInterest(economy: Economy): void {
  if (economy.depositRate <= 0) {
    return;
  }
  const monthly = economy.depositRate / 12;
  for (const household of economy.households) {
    const bank = economy.banks[household.bank];
    if (!bank || bank.failed || household.deposit <= 0) {
      continue;
    }
    const interest = moneyAmount(economy, household.deposit * monthly);
    if (interest <= 0 || bank.equity < interest) {
      continue;
    }
    creditDepositInterest(bank, household, economy, interest);
  }
}
