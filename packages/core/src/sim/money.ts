import { bondNumber } from './banking.js';
import { adjustBankEquity } from './capital-identity.js';
import type { Economy } from './economy.js';
import { spendableDeposit } from './helpers.js';
import type { Bank, Firm, Household } from './types.js';

/** Household, firm, or agent cash balance. */
export interface DepositAccount {
  deposit: number;
}

export function creditDeposit(account: DepositAccount, amount: number): void {
  account.deposit += amount;
}

export function debitDeposit(account: DepositAccount, amount: number): void {
  account.deposit -= amount;
}

export function setDeposit(account: DepositAccount, amount: number): void {
  account.deposit = amount;
}

export function transferDeposit(from: DepositAccount, to: DepositAccount, amount: number): void {
  from.deposit -= amount;
  to.deposit += amount;
}

export function creditTreasury(economy: Economy, amount: number): void {
  economy.govDeposits += amount;
}

export function debitTreasury(economy: Economy, amount: number): void {
  economy.govDeposits -= amount;
}

/** Firm receives the payment, then the treasury balance falls by the same amount. */
export function payFromTreasury(firm: Firm, economy: Economy, amount: number): void {
  firm.deposit += amount;
  economy.govDeposits -= amount;
}

export function setFirmLoan(firm: Firm, amount: number): void {
  firm.loan = amount;
}

export function setMortgage(household: Household, amount: number): void {
  household.mortgage = amount;
}

export function setConsumerLoan(household: Household, amount: number): void {
  household.consumerLoan = amount;
}

export function repayFirmLoan(firm: Firm, amount: number): void {
  firm.loan -= amount;
  firm.deposit -= amount;
}

export function drawFirmLoan(firm: Firm, amount: number): void {
  firm.loan += amount;
  firm.deposit += amount;
}

/** Coupon leaves the treasury and is booked as bank equity. */
export function payBondCoupon(bank: Bank, economy: Economy, coupon: number): void {
  economy.govDeposits -= coupon;
  adjustBankEquity(bank, economy, coupon);
}

/** Mortgage interest is bank income. Only principal repayment extinguishes the loan. */
export function payMortgageInterest(
  household: Household,
  bank: Bank,
  economy: Economy,
  interest: number,
): void {
  household.deposit -= interest;
  adjustBankEquity(bank, economy, interest);
}

export function payFirmInterest(firm: Firm, bank: Bank, economy: Economy, interest: number): void {
  firm.deposit -= interest;
  adjustBankEquity(bank, economy, interest);
}

/**
 * New mortgage: the principal is a new deposit paid to firms, the sellers.
 * The buyer does not keep it. The down payment is transferred separately.
 */
export function drawMortgage(household: Household, economy: Economy, principal: number): void {
  household.mortgage = principal;
  creditFirms(economy, principal);
}

export function repayMortgage(household: Household, amount: number): void {
  household.deposit -= amount;
  household.mortgage -= amount;
}

export function drawConsumerLoan(household: Household, amount: number): void {
  household.consumerLoan += amount;
  household.deposit += amount;
}

export function repayConsumerLoan(household: Household, amount: number): void {
  household.deposit -= amount;
  household.consumerLoan -= amount;
}

/** Payment fee: bank equity rises and the residual falls. */
export function collectBankFee(bank: Bank, economy: Economy, fee: number): void {
  adjustBankEquity(bank, economy, fee);
}

/**
 * Dividend: bank equity and vault cash fall together, up to available vault.
 * Book equity above vault (negative private equity) is not paid out as cash.
 */
export function releaseBankEquity(bank: Bank, economy: Economy, amount: number): void {
  const payable = Math.min(amount, Math.max(0, bank.vault));
  if (payable <= 0) {
    return;
  }
  bank.equity -= payable;
  bank.vault -= payable;
}

export function chargeEquityForDefault(
  bank: Bank | undefined,
  economy: Economy,
  loss: number,
): void {
  adjustBankEquity(bank, economy, -loss);
}

export function writeOffFirmLoan(
  firm: Firm,
  bank: Bank | undefined,
  economy: Economy,
  loss: number,
): void {
  firm.loan -= loss;
  adjustBankEquity(bank, economy, -loss);
}

/**
 * Cash home purchase: the buyer pays firms. Total deposits are unchanged.
 */
export function payCashForHome(household: Household, economy: Economy, price: number): void {
  household.deposit -= price;
  creditFirms(economy, price);
}

/** Split a cash receipt across firm deposits so the banking system keeps the money. */
export function creditFirms(economy: Economy, amount: number): void {
  if (amount <= 0 || economy.firms.length === 0) {
    return;
  }
  const count = economy.firms.length;
  const cents = economy.params.unit === 'cent';
  const each = cents ? Math.floor(amount / count) : amount / count;
  let paid = 0;
  for (let index = 0; index < count; index += 1) {
    const firm = economy.firms[index];
    if (!firm) {
      continue;
    }
    const share = index === count - 1 ? amount - paid : each;
    firm.deposit += share;
    paid += share;
  }
}

export function payDepositInterest(
  bank: Bank,
  household: Household,
  economy: Economy,
  interest: number,
): void {
  household.deposit += interest;
  adjustBankEquity(bank, economy, -interest);
}

/**
 * Fiat central-bank cover: reserves and equity rise together, and private equity
 * falls so vault still equals equity plus private equity. Vault itself is unchanged.
 */
export function subsidizeDepositInterest(bank: Bank, economy: Economy, amount: number): void {
  if (amount <= 0) {
    return;
  }
  bank.reserves += amount;
  adjustBankEquity(bank, economy, amount);
}

/**
 * Lender-of-last-resort capital: equity, vault, and reserves rise, and matching
 * deposits are credited to firms so bank books stay closed.
 */
export function injectBankCapital(bank: Bank, economy: Economy, amount: number): void {
  bank.equity += amount;
  bank.vault += amount;
  bank.reserves += amount;
  creditFirms(economy, amount);
}

export function addReserves(bank: Bank, amount: number): void {
  bank.reserves += amount;
}

/** Transition write-off: bond assets become reserves so total bank assets are unchanged. */
export function clearBonds(bank: Bank): void {
  bank.reserves += bondNumber(bank);
  bank.bonds = 0;
  bank.bondsOver = 0n;
}

/**
 * Reset a failed firm. Loan is already written off against equity. The deposit
 * balance is left unchanged so the banking system neither creates nor destroys money.
 */
export interface BitcoinAccount {
  bitcoin: number;
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

function coinValue(economy: Economy, account: BitcoinAccount): number {
  if (account.bitcoin <= 0 || !(economy.bitcoinPrice > 0)) {
    return 0;
  }
  return account.bitcoin * economy.bitcoinPrice;
}

export function resetFailedFirmAccounts(
  firm: Firm,
  _bank?: Bank,
  _economy?: Economy,
  _deposit?: number,
): void {
  void _bank;
  void _economy;
  void _deposit;
  firm.loan = 0;
}
