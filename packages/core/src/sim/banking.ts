import { exactCentSum } from '../money/amount.js';
import { bitcoinDepositUnits, bitcoinLoanUnits } from './dual-currency.js';
import type { Economy } from './economy.js';
import { clamp } from './stats.js';

export interface CentAggregates {
  deposits: bigint;
  loans: bigint;
  reserves: bigint;
  bonds: bigint;
  vault: bigint;
  equity: bigint;
}

/** Fiat deposit stock and the ledger value of bitcoin deposit units. */
export function moneyBalances(economy: Economy): { fiat: number; bitcoin: number } {
  return {
    fiat: fiatDeposits(economy),
    bitcoin: bitcoinDepositUnits(economy) * economy.bitcoinPrice,
  };
}

export function totalDeposits(economy: Economy): number {
  const balances = moneyBalances(economy);
  return balances.fiat + balances.bitcoin;
}

export function totalLoans(economy: Economy): number {
  return fiatLoans(economy) + bitcoinLoanUnits(economy) * economy.bitcoinPrice;
}

/** Cent stocks summed so the total stays exact after it passes the safe integer range. */
export function centAggregates(economy: Economy): CentAggregates {
  return {
    deposits: exactCentSum(fiatDepositParts(economy)),
    loans: exactCentSum(fiatLoanParts(economy)),
    reserves: exactCentSum(bankParts(economy, (bank) => bank.reserves)),
    bonds:
      economy.banks.reduce((total, bank) => total + bank.bondsOver, 0n) +
      exactCentSum(bankParts(economy, (bank) => bank.bonds)),
    vault: exactCentSum(bankParts(economy, (bank) => bank.vault)),
    equity: exactCentSum(bankParts(economy, (bank) => bank.equity)),
  };
}

/** Rounded assets minus rounded claims. Zero when the cent books close. */
export function centIdentityGap(economy: Economy): bigint {
  const assets =
    exactCentSum(assetParts(economy)) +
    economy.banks.reduce((total, bank) => total + bank.bondsOver, 0n);
  return assets - exactCentSum(claimParts(economy));
}

/** Add `amount` to the bond stock. Small balances stay numbers; the overflow is exact. */
export function addBonds(bank: Economy['banks'][number], amount: number): void {
  if (bank.bondsOver !== 0n) {
    bank.bondsOver += exactCentSum([amount]);
    return;
  }
  const next = bank.bonds + amount;
  if (Math.abs(next) <= Number.MAX_SAFE_INTEGER) {
    bank.bonds = next;
    return;
  }
  bank.bondsOver = exactCentSum([bank.bonds, amount]);
  bank.bonds = 0;
}

/** Bond stock as a number. Imprecise once `bondsOver` is in use. */
export function bondNumber(bank: Economy['banks'][number]): number {
  return bank.bonds + Number(bank.bondsOver);
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

function* assetParts(economy: Economy): Iterable<number> {
  yield* fiatLoanParts(economy);
  for (const bank of economy.banks) {
    yield bank.reserves;
    yield bank.vault;
    yield bank.bonds;
  }
}

function* claimParts(economy: Economy): Iterable<number> {
  yield* fiatDepositParts(economy);
  for (const bank of economy.banks) {
    yield bank.equity;
  }
}

function* fiatDepositParts(economy: Economy): Iterable<number> {
  yield economy.govDeposits;
  for (const household of economy.households) {
    yield household.deposit;
  }
  for (const firm of economy.firms) {
    yield firm.deposit;
  }
  for (const agent of economy.agents) {
    yield agent.deposit;
  }
  yield bitcoinDepositUnits(economy) * economy.bitcoinPrice;
}

function* fiatLoanParts(economy: Economy): Iterable<number> {
  for (const firm of economy.firms) {
    yield firm.loan;
  }
  for (const household of economy.households) {
    yield household.mortgage;
    yield household.consumerLoan;
  }
  yield bitcoinLoanUnits(economy) * economy.bitcoinPrice;
}

function* bankParts(
  economy: Economy,
  read: (bank: Economy['banks'][number]) => number,
): Iterable<number> {
  for (const bank of economy.banks) {
    yield read(bank);
  }
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
