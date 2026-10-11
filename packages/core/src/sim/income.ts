import { powerWeights, splitEqual, splitProportional } from './allocate.js';
import type { Economy } from './economy.js';
import { pay } from './helpers.js';
import { availableCash, payFromCash } from './dual-currency.js';
import { swapAtResidual } from './hybrid-money.js';
import { currencyFor, transferCurrency } from './hybrid-settle.js';
import { creditDeposit, debitDeposit } from './money.js';
import { PROFIT_SKILL_EXPONENT, UNEMPLOYED_TRANSFER } from './rules.js';
import type { Firm } from './types.js';

/** Move a slice of earned income to unemployed households without changing the total. */
export function redistributeToUnemployed(economy: Economy): void {
  const unemployed = economy.households.filter((household) => household.employer < 0);
  const employed = economy.households.filter((household) => household.employer >= 0);
  if (unemployed.length === 0 || employed.length === 0) {
    return;
  }
  const earned = employed.reduce((sum, household) => sum + household.income, 0);
  const taken = takeFromEmployed(employed, earned);
  payUnemployed(unemployed, taken);
}

/**
 * Pay wages from firm receipts, then distribute the residual as profit shares.
 * Profit weights rise faster than skill. Agent ownership follows household id.
 */
export function distributeIncome(economy: Economy): void {
  const wagePaid = new Array<number>(economy.households.length).fill(0);
  let profitPool = 0;
  const firmProfits: { firm: Firm; profit: number }[] = [];
  for (const firm of economy.firms) {
    const profit = payFirm(firm, wagePaid, economy);
    profitPool += profit;
    if (economy.params.regime === 'hybrid' && profit > 0) {
      firmProfits.push({ firm, profit });
    }
  }
  economy.wageBill = wagePaid.reduce((sum, amount) => sum + amount, 0);
  const profits = splitProportional(profitPool, ownershipWeights(economy));
  economy.profitPaid = profits.reduce((sum, value) => sum + value, 0);
  if (economy.params.regime === 'hybrid') {
    creditHybridHouseholds(economy, wagePaid, profits, firmProfits);
  } else {
    creditHouseholds(economy, wagePaid, profits);
  }
}

function takeFromEmployed(employed: Economy['households'], earned: number): number {
  const pool = Math.min(earned, Math.round(UNEMPLOYED_TRANSFER * earned));
  let taken = 0;
  for (const household of employed) {
    const cut =
      earned > 0 ? Math.min(household.income, Math.round((pool * household.income) / earned)) : 0;
    const paid = Math.min(household.deposit, cut);
    debitDeposit(household, paid);
    household.income -= paid;
    taken += paid;
  }
  return taken;
}

function payUnemployed(unemployed: Economy['households'], taken: number): void {
  const parts = splitEqual(taken, unemployed.length);
  for (let index = 0; index < unemployed.length; index += 1) {
    const household = unemployed[index];
    const share = parts[index] ?? 0;
    if (!household) {
      continue;
    }
    creditDeposit(household, share);
    household.income += share;
  }
}

function payFirm(firm: Firm, wagePaid: number[], economy: Economy): number {
  if (economy.params.regime === 'hybrid') {
    return payFirmHybrid(firm, wagePaid, economy);
  }
  const claims = wageClaims(economy, firm);
  const available = availableCash(economy, firm);
  const paid = layWages(claims, available, wagePaid);
  const owed = claims.reduce((sum, claim) => sum + claim.amount, 0);
  if (paid < owed) {
    firm.missedPayment = true;
  }
  payFromCash(economy, firm, available, 0);
  return available - paid;
}

/**
 * Pay each worker in their chosen currency. The profit pool is returned so
 * creditHouseholds can transfer it in each owner's currency.
 */
function payFirmHybrid(firm: Firm, wagePaid: number[], economy: Economy): number {
  const claims = wageClaims(economy, firm);
  const available = availableCash(economy, firm);
  const paid = layWages(claims, available, wagePaid);
  for (const claim of claims) {
    const share = wagePaid[claim.id] ?? 0;
    const worker = economy.households[claim.id];
    if (!worker || !(share > 0)) {
      continue;
    }
    transferCurrency(economy, firm, worker, share, currencyFor(worker));
  }
  return available - paid;
}

function wageClaims(economy: Economy, firm: Firm): { id: number; amount: number }[] {
  const claims: { id: number; amount: number }[] = [];
  for (const workerId of firm.workers) {
    const worker = economy.households[workerId];
    if (worker) {
      claims.push({ id: workerId, amount: pay(worker, firm) });
    }
  }
  return claims;
}

function layWages(
  claims: readonly { id: number; amount: number }[],
  available: number,
  wagePaid: number[],
): number {
  const owed = claims.reduce((sum, claim) => sum + claim.amount, 0);
  const budget = Math.min(available, owed);
  const parts =
    owed > 0 && budget > 0
      ? splitProportional(
          budget,
          claims.map((claim) => claim.amount),
        )
      : [];
  for (let index = 0; index < claims.length; index += 1) {
    const claim = claims[index];
    const share = parts[index] ?? 0;
    if (!claim) {
      continue;
    }
    wagePaid[claim.id] = (wagePaid[claim.id] ?? 0) + share;
  }
  return parts.reduce((sum, value) => sum + value, 0);
}

function ownershipWeights(economy: Economy): number[] {
  const concentration =
    PROFIT_SKILL_EXPONENT +
    (economy.aiFactor > 1 ? economy.params.ownership * (economy.aiFactor - 1) : 0);
  return powerWeights(
    economy.households.map((household) => household.skill),
    concentration,
  );
}

function creditHouseholds(economy: Economy, wagePaid: number[], profits: readonly number[]): void {
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    if (!household) {
      continue;
    }
    const share = profits[index] ?? 0;
    const wages = wagePaid[index] ?? 0;
    creditDeposit(household, wages + share);
    household.income = wages + share;
  }
}

/**
 * Wages already moved in payFirmHybrid. Drain each firm's profit pool and pay
 * owners in their chosen currency so custody and reserves stay matched.
 */
function creditHybridHouseholds(
  economy: Economy,
  wagePaid: number[],
  profits: readonly number[],
  firmProfits: readonly { firm: Firm; profit: number }[],
): void {
  for (const { firm, profit } of firmProfits) {
    payFromCash(economy, firm, profit, 0);
  }
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    if (!household) {
      continue;
    }
    const share = profits[index] ?? 0;
    const wages = wagePaid[index] ?? 0;
    if (share > 0) {
      // Recreate the drained profit as a deposit, then convert to the owner's currency.
      creditDeposit(household, share);
      if (currencyFor(household) === 'bitcoin') {
        swapAtResidual(economy, household, share);
      }
    }
    household.income = wages + share;
  }
}
