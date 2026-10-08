import { powerWeights, splitResidual } from './allocate.js';
import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import {
  chargeEquityForDefault,
  clearBonds,
  setConsumerLoan,
  setDeposit,
  setFirmLoan,
  setMortgage,
} from './money.js';
import type { Household } from './types.js';

/**
 * Fiat-to-bitcoin transition. With gradual weight 0, one-shot rebase at the end
 * of the window. With weight > 0, a share of the haircut and deposit reassignment
 * runs each month of the window, and the regime flips on the last month.
 */
export function onTransition(economy: Economy): void {
  const length = economy.params.transitionLength;
  if (length <= 0 || economy.transitionDone) {
    return;
  }
  const gradual = economy.params.gradualTransition;
  if (gradual <= 0) {
    if (economy.tick < length - 1) {
      return;
    }
    applyDebtHaircut(economy, economy.params.debtHaircut);
    redistributeDeposits(economy, 1);
    finishTransition(economy);
    return;
  }
  if (economy.tick >= length) {
    return;
  }
  const step = gradual / length;
  applyDebtHaircut(economy, economy.params.debtHaircut * step);
  redistributeDeposits(economy, step);
  if (economy.tick >= length - 1) {
    finishTransition(economy);
  }
}

function finishTransition(economy: Economy): void {
  for (const bank of economy.banks) {
    clearBonds(bank);
  }
  economy.params.regime = 'bitcoin';
  economy.params.unit = 'satoshi';
  economy.params.bondPurchaseShare = 0;
  economy.transitionDone = true;
}

function applyDebtHaircut(economy: Economy, haircut: number): void {
  if (haircut <= 0) {
    return;
  }
  for (const firm of economy.firms) {
    const cut = moneyAmount(economy, firm.loan * haircut);
    if (cut <= 0) {
      continue;
    }
    setFirmLoan(firm, Math.max(0, firm.loan - cut));
    chargeEquityForDefault(economy.banks[firm.bank], economy, cut);
  }
  for (const household of economy.households) {
    const mortgageCut = moneyAmount(economy, household.mortgage * haircut);
    const consumerCut = moneyAmount(economy, household.consumerLoan * haircut);
    const cut = mortgageCut + consumerCut;
    setMortgage(household, Math.max(0, household.mortgage - mortgageCut));
    setConsumerLoan(household, Math.max(0, household.consumerLoan - consumerCut));
    if (cut > 0) {
      chargeEquityForDefault(economy.banks[household.bank], economy, cut);
    }
    if (household.mortgage <= 0) {
      household.mortgagePayment = 0;
      if (household.tenure === 'mortgage') {
        household.tenure = 'owned';
      }
    }
  }
}

function redistributeDeposits(economy: Economy, weight: number): void {
  if (weight <= 0) {
    return;
  }
  const total = positiveDeposits(economy);
  if (total <= 0 || economy.households.length === 0) {
    return;
  }
  const weights = powerWeights(
    economy.households.map((household) => household.skill),
    1 + 4 * economy.params.holderConcentration,
  );
  const targetParts = splitResidual(total, weights);
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = requireHousehold(economy, index);
    const target = roundedShare(economy, targetParts[index]);
    const next = household.deposit + (target - household.deposit) * weight;
    setDeposit(household, moneyAmount(economy, Math.max(0, next)));
  }
  // Seat residual on the last household so the stock is conserved after rounding.
  const after = positiveDeposits(economy);
  const last = requireHousehold(economy, economy.households.length - 1);
  setDeposit(last, last.deposit + (total - after));
}

function roundedShare(economy: Economy, share: number | undefined): number {
  if (share === undefined || !Number.isFinite(share)) {
    throw new Error('Deposit reassignment is missing a household share');
  }
  return moneyAmount(economy, share);
}

function requireHousehold(economy: Economy, index: number): Household {
  const household = economy.households[index];
  if (!household) {
    throw new Error('Deposit reassignment is missing a household');
  }
  return household;
}

function positiveDeposits(economy: Economy): number {
  return economy.households.reduce((sum, household) => sum + Math.max(0, household.deposit), 0);
}
