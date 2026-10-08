import { adjustBankEquity } from './capital-identity.js';
import type { Economy } from './economy.js';
import { spendableDeposit } from './helpers.js';
import type { DepositAccount } from './money.js';

/** Household, firm, agent, or treasury bitcoin cash balance. */
export interface BitcoinAccount {
  bitcoin: number;
}

/** Outstanding bitcoin deposit units across the economy. */
export function bitcoinDepositUnits(economy: Economy): number {
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

/** Outstanding bitcoin loan units across firms and households. */
export function bitcoinLoanUnits(economy: Economy): number {
  let total = 0;
  for (const firm of economy.firms) {
    total += firm.bitcoinLoan;
  }
  for (const household of economy.households) {
    total += household.bitcoinMortgage + household.bitcoinConsumer;
  }
  return total;
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
  const deposits = bitcoinDepositUnits(economy) * price;
  const loans = bitcoinLoanUnits(economy) * price;
  const equityGap = loans - economy.bitcoinLoanCarried - (deposits - economy.bitcoinCarried);
  if (Math.abs(equityGap) > 1e-9) {
    adjustBankEquity(economy.banks[0], economy, equityGap);
  }
  economy.bitcoinCarried = deposits;
  economy.bitcoinLoanCarried = loans;
}

/** Coin units acquired at the current bitcoin price. The carried value matches that price. */
export function creditBitcoin(economy: Economy, account: BitcoinAccount, units: number): void {
  if (!(units > 0)) {
    return;
  }
  account.bitcoin += units;
  economy.bitcoinCarried += units * economy.bitcoinPrice;
}

export function debitBitcoin(economy: Economy, account: BitcoinAccount, units: number): void {
  if (!(units > 0) || account.bitcoin <= 0) {
    return;
  }
  const taken = Math.min(account.bitcoin, units);
  account.bitcoin -= taken;
  economy.bitcoinCarried -= taken * economy.bitcoinPrice;
}

export function creditBitcoinLoan(
  economy: Economy,
  account: { bitcoinLoan: number },
  units: number,
): void {
  if (!(units > 0)) {
    return;
  }
  account.bitcoinLoan += units;
  economy.bitcoinLoanCarried += units * economy.bitcoinPrice;
}

/** Cash that can be spent while leaving `reserved` aside for debt service. */
export function spendableCash(
  economy: Economy,
  account: DepositAccount & BitcoinAccount,
  reserved: number,
): number {
  const coins = coinValue(economy, account);
  return Math.max(0, Math.max(0, account.deposit) + coins - reserved);
}

/** Firm receipts, floored to a spendable cent when the unit is cents. */
export function availableCash(economy: Economy, account: DepositAccount & BitcoinAccount): number {
  return spendableDeposit(economy, account.deposit + coinValue(economy, account));
}

/**
 * Pay `amount` from fiat above `reserved`, then from bitcoin.
 * Bitcoin spent is valued at the current price and leaves the carried stock.
 */
export function payFromCash(
  economy: Economy,
  account: DepositAccount & BitcoinAccount,
  amount: number,
  reserved: number,
): void {
  if (!(amount > 0)) {
    return;
  }
  const price = economy.bitcoinPrice;
  const fiatFree = Math.max(0, account.deposit - reserved);
  const fromFiat = Math.min(fiatFree, amount);
  account.deposit -= fromFiat;
  let rest = amount - fromFiat;
  if (!(rest > 0)) {
    return;
  }
  const coins = coinValue(economy, account);
  const reserveShort = Math.max(0, reserved - Math.max(0, account.deposit + fromFiat));
  const coinFree = Math.max(0, coins - reserveShort);
  const take = Math.min(coinFree, rest);
  if (take > 0 && price > 0) {
    debitBitcoin(economy, account, take / price);
    rest -= take;
  }
  if (rest > 0) {
    account.deposit -= rest;
  }
}

/** Turn bitcoin units into fiat deposits, up to `amount` of value, so a fiat debit can pay. */
export function fundFromBitcoin(
  economy: Economy,
  account: DepositAccount & BitcoinAccount,
  amount: number,
): void {
  const price = economy.bitcoinPrice;
  const short = amount - Math.max(0, account.deposit);
  if (!(short > 0) || account.bitcoin <= 0 || !(price > 0)) {
    return;
  }
  const take = Math.min(short, account.bitcoin * price);
  debitBitcoin(economy, account, take / price);
  account.deposit += take;
}

/** Move bitcoin units back into the fiat deposit at the current price. */
export function foldBitcoinCash(economy: Economy, account: DepositAccount & BitcoinAccount): void {
  const units = account.bitcoin;
  if (!(units > 0)) {
    return;
  }
  account.deposit += units * economy.bitcoinPrice;
  account.bitcoin = 0;
  economy.bitcoinCarried -= units * economy.bitcoinPrice;
}

export function foldBitcoinLoan(
  economy: Economy,
  units: number,
  addFiat: (value: number) => void,
  clear: () => void,
): void {
  if (!(units > 0)) {
    return;
  }
  const value = units * economy.bitcoinPrice;
  addFiat(value);
  clear();
  economy.bitcoinLoanCarried -= value;
}

export function coinValue(economy: Economy, account: BitcoinAccount): number {
  if (account.bitcoin <= 0 || !(economy.bitcoinPrice > 0)) {
    return 0;
  }
  return account.bitcoin * economy.bitcoinPrice;
}
