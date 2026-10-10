import { splitResidual } from './allocate.js';
import { adjustBankEquity } from './capital-identity.js';
import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { setDeposit, setMortgage } from './money.js';
import type { Household } from './types.js';

/** Stamp opening mortgages at the rebase so their real payment stays fixed. */
export function stampRealMortgages(economy: Economy): void {
  if (economy.params.realMortgage !== 'on') {
    return;
  }
  let stamped = false;
  for (const household of economy.households) {
    if (household.mortgage > 0) {
      household.mortgageIndexed = true;
      stamped = true;
    }
  }
  if (stamped) {
    economy.realMortgagePrice = economy.priceLevel;
  }
}

/**
 * Scale indexed mortgages with the price level. The capital-ratio share of the
 * principal change seats on bank equity; the rest seats on deposits at that bank.
 */
export function revalueRealMortgages(economy: Economy): void {
  // Revalue if the transition slider is on OR if there are any indexed mortgages
  // (which can be created automatically in Bitcoin regimes)
  const hasIndexedMortgages = economy.realMortgagePrice > 0;
  if (economy.params.realMortgage !== 'on' && !hasIndexedMortgages) {
    return;
  }
  const anchor = economy.realMortgagePrice;
  const factor = economy.priceLevel / anchor;
  if (!Number.isFinite(factor) || Math.abs(factor - 1) < 1e-12) {
    economy.realMortgagePrice = economy.priceLevel;
    return;
  }

  const principalDeltaByBank = new Map<number, number>();
  for (const household of economy.households) {
    if (!household.mortgageIndexed || household.mortgage <= 0) {
      continue;
    }
    const nextPrincipal = moneyAmount(economy, household.mortgage * factor);
    const nextPayment = moneyAmount(economy, household.mortgagePayment * factor);
    const delta = nextPrincipal - household.mortgage;
    setMortgage(household, nextPrincipal);
    household.mortgagePayment = nextPayment;
    if (nextPrincipal <= 0) {
      clearIndexedMortgage(household);
    }
    if (delta !== 0) {
      principalDeltaByBank.set(
        household.bank,
        (principalDeltaByBank.get(household.bank) ?? 0) + delta,
      );
    }
  }

  for (const [bankId, principalDelta] of principalDeltaByBank) {
    seatPrincipalMark(economy, bankId, principalDelta);
  }
  economy.realMortgagePrice = economy.priceLevel;
}

function clearIndexedMortgage(household: Household): void {
  setMortgage(household, 0);
  household.mortgagePayment = 0;
  household.mortgageArrears = 0;
  household.mortgageIndexed = false;
  if (household.tenure === 'mortgage') {
    household.tenure = 'owned';
  }
}

function seatPrincipalMark(economy: Economy, bankId: number, principalDelta: number): void {
  const bank = economy.banks[bankId];
  if (!bank || principalDelta === 0) {
    return;
  }
  const equityShare = moneyAmount(economy, principalDelta * economy.params.capitalRatio);
  let depositShare = moneyAmount(economy, principalDelta - equityShare);
  adjustBankEquity(bank, economy, equityShare);

  const accounts = depositAccountsAt(economy, bankId);
  if (accounts.length === 0) {
    adjustBankEquity(bank, economy, depositShare);
    return;
  }

  const weights = accounts.map((account) => Math.max(0, account.deposit));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0) {
    // No positive deposits to reweight: seat the whole remainder on the first account.
    const first = accounts[0];
    if (first) {
      setDeposit(first, moneyAmount(economy, first.deposit + depositShare));
    } else {
      adjustBankEquity(bank, economy, depositShare);
    }
    return;
  }

  if (depositShare < 0) {
    const cut = -depositShare;
    if (cut > weightSum) {
      // Deposits cannot absorb the whole cut; the remainder stays on equity.
      const extraEquity = moneyAmount(economy, -(cut - weightSum));
      depositShare = moneyAmount(economy, -weightSum);
      adjustBankEquity(bank, economy, extraEquity);
    }
  }

  const parts = splitResidual(depositShare, weights);
  let applied = 0;
  for (let index = 0; index < accounts.length; index += 1) {
    const account = accounts[index];
    const part = parts[index] ?? 0;
    if (!account || part === 0) {
      continue;
    }
    const next = moneyAmount(economy, Math.max(0, account.deposit + part));
    applied += next - account.deposit;
    setDeposit(account, next);
  }
  const residual = moneyAmount(economy, depositShare - applied);
  if (residual !== 0) {
    const seat = accounts.reduce((best, account) =>
      account.deposit >= best.deposit ? account : best,
    );
    setDeposit(seat, moneyAmount(economy, Math.max(0, seat.deposit + residual)));
  }
}

function depositAccountsAt(
  economy: Economy,
  bankId: number,
): Array<{ deposit: number }> {
  const accounts: Array<{ deposit: number }> = [];
  for (const household of economy.households) {
    if (household.bank === bankId) {
      accounts.push(household);
    }
  }
  for (const firm of economy.firms) {
    if (firm.bank === bankId) {
      accounts.push(firm);
    }
  }
  for (const agent of economy.agents) {
    const owner = economy.households[agent.owner];
    if (owner && owner.bank === bankId) {
      accounts.push(agent);
    }
  }
  if (bankId === 0) {
    accounts.push({
      get deposit() {
        return economy.govDeposits;
      },
      set deposit(value: number) {
        economy.govDeposits = value;
      },
    });
  }
  return accounts;
}
