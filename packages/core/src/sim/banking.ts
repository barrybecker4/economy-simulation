import type { Economy } from './economy.js';
import { clamp } from './stats.js';

/** Fiat deposit stock and the ledger value of bitcoin deposit units. */
export function moneyBalances(economy: Economy): { fiat: number; bitcoin: number } {
  return {
    fiat: fiatDeposits(economy),
    bitcoin: bitcoinUnits(economy) * economy.bitcoinPrice,
  };
}

export function totalDeposits(economy: Economy): number {
  const balances = moneyBalances(economy);
  return balances.fiat + balances.bitcoin;
}

export function totalLoans(economy: Economy): number {
  return fiatLoans(economy) + bitcoinLoanUnits(economy) * economy.bitcoinPrice;
}

/**
 * A bitcoin price move revalues units. Seat that gap on bank equity so
 * loans + reserves + bonds + vault still equals deposits + equity.
 */
export function markBitcoinToMarket(economy: Economy): void {
  const price = economy.bitcoinPrice;
  if (!(price > 0)) {
    return;
  }
  const deposits = bitcoinUnits(economy) * price;
  const loans = bitcoinLoanUnits(economy) * price;
  const equityGap = loans - economy.bitcoinLoanCarried - (deposits - economy.bitcoinCarried);
  if (Math.abs(equityGap) > 1e-9) {
    const bank = economy.banks[0];
    if (bank) {
      bank.equity += equityGap;
    }
    economy.privateEquity -= equityGap;
  }
  economy.bitcoinCarried = deposits;
  economy.bitcoinLoanCarried = loans;
}

function fiatDeposits(economy: Economy): number {
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

function bitcoinUnits(economy: Economy): number {
  let total = economy.govBitcoin;
  for (const household of economy.households) {
    total += household.bitcoin;
  }
  for (const firm of economy.firms) {
    total += firm.bitcoin;
  }
  for (const agent of economy.agents) {
    total += agent.bitcoin;
  }
  return total;
}

function fiatLoans(economy: Economy): number {
  let total = 0;
  for (const firm of economy.firms) {
    total += firm.loan;
  }
  for (const household of economy.households) {
    total += household.mortgage + household.consumerLoan;
  }
  return total;
}

function bitcoinLoanUnits(economy: Economy): number {
  let total = 0;
  for (const firm of economy.firms) {
    total += firm.bitcoinLoan;
  }
  for (const household of economy.households) {
    total += household.bitcoinMortgage + household.bitcoinConsumer;
  }
  return total;
}

export function loansAt(economy: Economy, bankId: number): number {
  return firmLoansAt(economy, bankId) + householdLoansAt(economy, bankId);
}

export function firmLoansAt(economy: Economy, bankId: number): number {
  let total = 0;
  for (const firm of economy.firms) {
    if (firm.bank === bankId) {
      total += firm.loan;
    }
  }
  return total;
}

export function householdLoansAt(economy: Economy, bankId: number): number {
  let total = 0;
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
  const base = Math.max(0, cap - loans) * (1 + Math.max(0, economy.creditImpulse));
  if (economy.params.endogenousWeight <= 0) {
    return base;
  }
  if (economy.creditStress <= 0.05) {
    return base * (1 + economy.params.endogenousWeight * 4);
  }
  return base * clamp(1 - economy.creditStress, 0.05, 1);
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
  const share = economy.params.householdMortgageShare;
  const reserved = reservedMortgageRoom(economy, bankId, bank.equity, share);
  const general = Math.max(0, capitalRoom - reserved);
  if (economy.params.regime === 'fiat') {
    return general;
  }
  return Math.min(general, savingsRoom(economy));
}

/**
 * Lending room reserved for household mortgages. At share 0, mortgages compete for
 * the same capital room as firms (previous behavior).
 */
export function mortgageCreditRoom(economy: Economy, bankId: number): number {
  const bank = economy.banks[bankId];
  if (!bank || bank.failed) {
    return 0;
  }
  const share = economy.params.householdMortgageShare;
  if (share <= 0) {
    return bankCreditRoom(economy, bankId);
  }
  const capitalRoom = lendingRoom(economy, bankId, bank.equity);
  const reserved = reservedMortgageRoom(economy, bankId, bank.equity, share);
  const room = Math.max(reserved, capitalRoom * share);
  if (economy.params.regime === 'fiat') {
    return room;
  }
  return Math.min(room, savingsRoom(economy));
}

function reservedMortgageRoom(
  economy: Economy,
  bankId: number,
  bankEquity: number,
  share: number,
): number {
  if (share <= 0 || bankEquity <= 0) {
    return 0;
  }
  const cap = bankEquity / Math.max(economy.params.capitalRatio, 0.01);
  return Math.max(0, share * cap - householdLoansAt(economy, bankId));
}
