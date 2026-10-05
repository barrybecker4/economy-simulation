import type { Economy } from './economy.js';
import {
  employedCount,
  humanWeight,
  inflation,
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
  if (economy.params.regime !== 'fiat') {
    const savings = savingsStock(economy);
    const pressure = savings > 0 ? totalLoans(economy) / savings - 1 : 0;
    economy.policyRate = Math.max(0, economy.policyRate + 0.05 * pressure);
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
}
