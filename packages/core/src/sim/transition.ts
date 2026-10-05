import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';

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
    bank.bonds = 0;
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
    firm.loan = Math.max(0, firm.loan - cut);
  }
  for (const household of economy.households) {
    const mortgageCut = moneyAmount(economy, household.mortgage * haircut);
    const consumerCut = moneyAmount(economy, household.consumerLoan * haircut);
    household.mortgage = Math.max(0, household.mortgage - mortgageCut);
    household.consumerLoan = Math.max(0, household.consumerLoan - consumerCut);
    if (household.mortgage <= 0) {
      household.mortgagePayment = 0;
      if (household.tenure === 'mortgage') {
        household.tenure = 'owned';
      }
    }
  }
}

function redistributeDeposits(economy: Economy): void {
  const concentration = economy.params.holderConcentration;
  let total = 0;
  for (const household of economy.households) {
    total += Math.max(0, household.deposit);
  }
  if (total <= 0 || economy.households.length === 0) {
    return;
  }
  const weights = economy.households.map((household) => household.skill ** (1 + 4 * concentration));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  if (weightSum <= 0) {
    return;
  }
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    const weight = weights[index] ?? 0;
    if (!household) {
      continue;
    }
    household.deposit = moneyAmount(economy, (total * weight) / weightSum);
  }
}
