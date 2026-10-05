import type { Economy } from './economy.js';
import {
  employedCount,
  humanWeight,
  inflation,
  moneyAmount,
  naturalUnemployment,
  savingsStock,
  totalDeposits,
  totalLoans,
} from './helpers.js';

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
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
  if (economy.params.regime !== 'fiat') {
    const savings = savingsStock(economy);
    const pressure = savings > 0 ? totalLoans(economy) / savings - 1 : 0;
    economy.policyRate = Math.max(0, economy.policyRate + 0.05 * pressure);
    economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
    if (economy.params.regime === 'hybrid') {
      for (const bank of economy.banks) {
        if (bank.equity < 0) {
          const injection = -bank.equity + 1;
          bank.equity += injection;
          bank.vault += injection;
          bank.reserves += injection;
        }
      }
    }
    payDepositInterest(economy);
    return;
  }
  const inflationRate = inflation(economy);
  const unemployment = 1 - employedCount(economy) / economy.households.length;
  const gap = (naturalUnemployment(economy) - unemployment) * humanWeight(economy);
  economy.policyRate = taylorRate({
    timePrefMean: economy.params.timePrefMean,
    inflation: inflationRate,
    inflationTarget: economy.params.inflationTarget,
    inflationWeight: economy.params.inflationWeight,
    outputWeight: economy.params.outputWeight,
    outputGap: gap,
  });
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
  const deposits = totalDeposits(economy);
  const required = Math.round(economy.params.reserveRequirement * deposits);
  const reserves = economy.banks.reduce((sum, bank) => sum + bank.reserves, 0);
  if (reserves < required) {
    const add = required - reserves;
    const bank = economy.banks[0];
    if (bank) {
      bank.reserves += add;
    }
  }
  payDepositInterest(economy);
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
    bank.equity -= interest;
    household.deposit += interest;
    economy.privateEquity += interest;
  }
}
