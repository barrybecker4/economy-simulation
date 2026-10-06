import type { Economy } from './economy.js';

export function totalDeposits(economy: Economy): number {
  let total = economy.govDeposits;
  for (const household of economy.households) {
    total += household.deposit;
  }
  for (const firm of economy.firms) {
    total += firm.deposit;
  }
  for (const agent of economy.agents) {
    total += agent.deposit;
  }
  return total;
}

export function totalLoans(economy: Economy): number {
  let total = 0;
  for (const firm of economy.firms) {
    total += firm.loan;
  }
  for (const household of economy.households) {
    total += household.mortgage + household.consumerLoan;
  }
  return total;
}

export function loansAt(economy: Economy, bankId: number): number {
  let total = 0;
  for (const firm of economy.firms) {
    if (firm.bank === bankId) {
      total += firm.loan;
    }
  }
  for (const household of economy.households) {
    if (household.bank === bankId) {
      total += household.mortgage + household.consumerLoan;
    }
  }
  return total;
}

export function equityFor(economy: Economy, loans: number): number {
  const ratio = economy.params.capitalRatio / Math.max(0.01, 1 - economy.params.capitalRatio);
  return Math.max(1, Math.round(1.5 * ratio * Math.max(loans, 1)));
}

export function lendingRoom(economy: Economy, bankId: number, bankEquity: number): number {
  const loans = loansAt(economy, bankId);
  const cap = bankEquity / Math.max(economy.params.capitalRatio, 0.01);
  return Math.max(0, cap - loans) * (1 + Math.max(0, economy.creditImpulse));
}

export function savingsStock(economy: Economy): number {
  const fraction = economy.params.lendingModel === 'fullReserve' ? 0.1 : 0.25;
  let total = 0;
  for (const household of economy.households) {
    total += Math.max(0, household.deposit) * fraction;
  }
  return total;
}

export function savingsRoom(economy: Economy): number {
  return Math.max(0, savingsStock(economy) - totalLoans(economy));
}

/** Fiat lending follows bank capital. Bitcoin and hybrid also cannot exceed unused savings. */
export function bankCreditRoom(economy: Economy, bankId: number): number {
  const bank = economy.banks[bankId];
  if (!bank || bank.failed) {
    return 0;
  }
  const capitalRoom = lendingRoom(economy, bankId, bank.equity);
  if (economy.params.regime === 'fiat') {
    return capitalRoom;
  }
  return Math.min(capitalRoom, savingsRoom(economy));
}
