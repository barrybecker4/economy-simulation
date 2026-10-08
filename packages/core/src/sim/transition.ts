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
 * One-shot rebase at the end of the transition window: haircut nominal debts,
 * reassign household deposits by holder concentration, freeze base money, and
 * switch the active regime to bitcoin. Balances stay in the ledger unit chosen
 * at the start of the run (satoshi when a transition is configured).
 */
export function onTransition(economy: Economy): void {
  const length = economy.params.transitionLength;
  if (length <= 0 || economy.transitionDone) {
    return;
  }
  if (economy.tick < length - 1) {
    return;
  }
  applyDebtHaircut(economy);
  redistributeDeposits(economy);
  for (const bank of economy.banks) {
    clearBonds(bank);
  }
  economy.params.regime = 'bitcoin';
  economy.params.unit = 'satoshi';
  economy.params.bondPurchaseShare = 0;
  economy.transitionDone = true;
}

function applyDebtHaircut(economy: Economy): void {
  const haircut = economy.params.debtHaircut;
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

function redistributeDeposits(economy: Economy): void {
  const total = positiveDeposits(economy);
  if (total <= 0 || economy.households.length === 0) {
    return;
  }
  const weights = powerWeights(
    economy.households.map((household) => household.skill),
    1 + 4 * economy.params.holderConcentration,
  );
  const parts = splitResidual(total, weights);
  let assigned = 0;
  const last = economy.households.length - 1;
  for (let index = 0; index < last; index += 1) {
    const amount = roundedShare(economy, parts[index]);
    setDeposit(requireHousehold(economy, index), amount);
    assigned += amount;
  }
  setDeposit(requireHousehold(economy, last), total - assigned);
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
  let total = 0;
  for (const household of economy.households) {
    total += Math.max(0, household.deposit);
  }
  return total;
}
