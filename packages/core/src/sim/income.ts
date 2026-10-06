import { powerWeights, splitEqual, splitProportional } from './allocate.js';
import type { Economy } from './economy.js';
import { pay } from './helpers.js';

/** Move a slice of earned income to unemployed households without changing the total. */
export function redistributeToUnemployed(economy: Economy): void {
  const unemployed = economy.households.filter((household) => household.employer < 0);
  const employed = economy.households.filter((household) => household.employer >= 0);
  if (unemployed.length === 0 || employed.length === 0) {
    return;
  }
  const earned = employed.reduce((sum, household) => sum + household.income, 0);
  const pool = Math.min(earned, Math.round(0.05 * earned));
  let taken = 0;
  for (const household of employed) {
    const cut =
      earned > 0 ? Math.min(household.income, Math.round((pool * household.income) / earned)) : 0;
    const paid = Math.min(household.deposit, cut);
    household.deposit -= paid;
    household.income -= paid;
    taken += paid;
  }
  const parts = splitEqual(taken, unemployed.length);
  for (let index = 0; index < unemployed.length; index += 1) {
    const household = unemployed[index];
    const share = parts[index] ?? 0;
    if (!household) {
      continue;
    }
    household.deposit += share;
    household.income += share;
  }
}

/**
 * Pay wages from firm receipts, then distribute the residual as profit shares.
 * Ownership weights rise faster than skill, so wealth stays more unequal than income.
 */
export function distributeIncome(economy: Economy): void {
  const wagePaid = new Array<number>(economy.households.length).fill(0);
  let profitPool = 0;
  for (const firm of economy.firms) {
    const pays: { id: number; amount: number }[] = [];
    let owed = 0;
    for (const workerId of firm.workers) {
      const worker = economy.households[workerId];
      if (!worker) {
        continue;
      }
      const amount = pay(worker, firm);
      owed += amount;
      pays.push({ id: workerId, amount });
    }
    const available = Math.max(0, Math.round(firm.deposit));
    const wageBudget = Math.min(available, owed);
    const weights = pays.map((item) => item.amount);
    const parts = owed > 0 && wageBudget > 0 ? splitProportional(wageBudget, weights) : [];
    for (let index = 0; index < pays.length; index += 1) {
      const item = pays[index];
      const share = parts[index] ?? 0;
      if (!item) {
        continue;
      }
      wagePaid[item.id] = (wagePaid[item.id] ?? 0) + share;
    }
    profitPool += available - parts.reduce((sum, value) => sum + value, 0);
    firm.deposit -= available;
  }
  economy.wageBill = wagePaid.reduce((sum, amount) => sum + amount, 0);
  const concentration =
    1.5 + (economy.aiFactor > 1 ? economy.params.ownership * (economy.aiFactor - 1) : 0);
  const weights = powerWeights(
    economy.households.map((household) => household.skill),
    concentration,
  );
  const profits = splitProportional(profitPool, weights);
  economy.profitPaid = profits.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    if (!household) {
      continue;
    }
    const share = profits[index] ?? 0;
    const wages = wagePaid[index] ?? 0;
    household.deposit += wages + share;
    household.income = wages + share;
  }
}
