import { bondNumber } from './banking.js';
import { adjustBankEquity } from './capital-identity.js';
import {
  creditBitcoin,
  creditBitcoinLoan,
  debitBitcoin,
  fundFromBitcoin,
} from './dual-currency.js';
import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { fundCoinsFromFiat } from './hybrid-money.js';
import { currencyFor } from './hybrid-settle.js';
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

/** Repay firm debt from the till it was issued in. Returns the value actually collected. */
export function repayFirmLoan(firm: Firm, amount: number, economy?: Economy): number {
  if (!(amount > 0)) {
    return 0;
  }
  if (economy && economy.params.regime === 'hybrid') {
    return repayHybridFirmLoan(economy, firm, amount);
  }
  firm.loan -= amount;
  firm.deposit -= amount;
  return amount;
}

function repayHybridFirmLoan(economy: Economy, firm: Firm, amount: number): number {
  let left = amount;
  let paid = 0;
  const fiatFromTill = Math.min(left, Math.max(0, firm.loan), Math.max(0, firm.deposit));
  if (fiatFromTill > 0) {
    firm.loan -= fiatFromTill;
    firm.deposit -= fiatFromTill;
    left -= fiatFromTill;
    paid += fiatFromTill;
  }
  const coinFromTill = repayBitcoinFirmLoan(economy, firm, left);
  left -= coinFromTill;
  paid += coinFromTill;
  if (left > 0 && firm.loan > 0) {
    fundFromBitcoin(economy, firm, Math.min(left, firm.loan));
    const extra = Math.min(left, firm.loan, Math.max(0, firm.deposit));
    if (extra > 0) {
      firm.loan -= extra;
      firm.deposit -= extra;
      left -= extra;
      paid += extra;
    }
  }
  if (left > 0 && firm.bitcoinLoan > 0) {
    const price = economy.bitcoinPrice;
    if (price > 0) {
      fundCoinsFromFiat(economy, firm, Math.min(left, firm.bitcoinLoan * price));
      paid += repayBitcoinFirmLoan(economy, firm, left);
    }
  }
  return paid;
}

function repayBitcoinFirmLoan(economy: Economy, firm: Firm, amount: number): number {
  const price = economy.bitcoinPrice;
  if (!(price > 0) || !(amount > 0) || firm.bitcoinLoan <= 0) {
    return 0;
  }
  const units = Math.min(firm.bitcoinLoan, Math.max(0, firm.bitcoin), amount / price);
  if (!(units > 0)) {
    return 0;
  }
  firm.bitcoinLoan -= units;
  economy.bitcoinLoanCarried -= units * price;
  debitBitcoin(economy, firm, units);
  return units * price;
}

export function drawFirmLoan(firm: Firm, amount: number, economy?: Economy): void {
  if (economy && economy.params.regime === 'hybrid' && currencyFor(firm) === 'bitcoin') {
    drawBitcoinFirmLoan(economy, firm, amount);
    return;
  }
  firm.loan += amount;
  firm.deposit += amount;
}

function drawBitcoinFirmLoan(economy: Economy, firm: Firm, amount: number): void {
  const price = economy.bitcoinPrice;
  if (!(price > 0)) {
    firm.loan += amount;
    firm.deposit += amount;
    return;
  }
  const units = amount / price;
  creditBitcoinLoan(economy, firm, units);
  creditBitcoin(economy, firm, units);
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
  // In Bitcoin/hybrid regimes, automatically index new mortgages to the price
  // level, similar to HOLC loans during the Great Depression. This prevents
  // debt-deflation spirals where nominal payments become unpayable as prices fall.
  // Bitcoin regimes typically experience deflation equal to productivity growth.
  if (economy.params.regime === 'bitcoin' || economy.params.regime === 'hybrid') {
    household.mortgageIndexed = true;
    if (economy.realMortgagePrice <= 0) {
      economy.realMortgagePrice = economy.priceLevel;
    }
  }
  if (economy.params.regime === 'hybrid' && currencyFor(household) === 'bitcoin') {
    const price = economy.bitcoinPrice;
    if (price > 0) {
      const units = principal / price;
      household.bitcoinMortgage += units;
      economy.bitcoinLoanCarried += units * price;
      creditFirmsBitcoin(economy, principal);
      return;
    }
  }
  // New purchase replaces any stray principal left after a tenure mismatch.
  if (household.mortgage > 0) {
    chargeEquityForDefault(economy.banks[household.bank], economy, household.mortgage);
  }
  household.mortgage = principal;
  creditFirms(economy, principal);
}

/** Repay fiat mortgage principal from the fiat deposit. Coin principal uses repayBitcoinMortgage. */
export function repayMortgage(household: Household, amount: number): void {
  if (!(amount > 0) || household.mortgage <= 0) {
    return;
  }
  household.deposit -= amount;
  household.mortgage -= amount;
}

/** Repay a coin mortgage from bitcoin already held. Returns the value collected. */
export function repayBitcoinMortgage(
  economy: Economy,
  household: Household,
  amount: number,
): number {
  return repayCoinStock(
    economy,
    amount,
    household.bitcoin,
    household.bitcoinMortgage,
    (units, price) => {
      household.bitcoinMortgage -= units;
      economy.bitcoinLoanCarried -= units * price;
      debitBitcoin(economy, household, units);
    },
  );
}

export function drawConsumerLoan(household: Household, amount: number, economy?: Economy): void {
  if (economy && economy.params.regime === 'hybrid' && currencyFor(household) === 'bitcoin') {
    const price = economy.bitcoinPrice;
    if (price > 0) {
      const units = amount / price;
      household.bitcoinConsumer += units;
      economy.bitcoinLoanCarried += units * price;
      creditBitcoin(economy, household, units);
      return;
    }
  }
  household.consumerLoan += amount;
  household.deposit += amount;
}

/** Repay a fiat consumer loan from the fiat deposit. Coin principal uses repayBitcoinConsumer. */
export function repayConsumerLoan(household: Household, amount: number): void {
  if (!(amount > 0) || household.consumerLoan <= 0) {
    return;
  }
  household.deposit -= amount;
  household.consumerLoan -= amount;
}

/** Repay a coin consumer loan from bitcoin already held. Returns the value collected. */
export function repayBitcoinConsumer(
  economy: Economy,
  household: Household,
  amount: number,
): number {
  return repayCoinStock(
    economy,
    amount,
    household.bitcoin,
    household.bitcoinConsumer,
    (units, price) => {
      household.bitcoinConsumer -= units;
      economy.bitcoinLoanCarried -= units * price;
      debitBitcoin(economy, household, units);
    },
  );
}

function repayCoinStock(
  economy: Economy,
  amount: number,
  held: number,
  owed: number,
  apply: (units: number, price: number) => void,
): number {
  const price = economy.bitcoinPrice;
  if (!(price > 0) || !(amount > 0) || owed <= 0 || held <= 0) {
    return 0;
  }
  const units = Math.min(owed, held, amount / price);
  if (!(units > 0)) {
    return 0;
  }
  apply(units, price);
  return units * price;
}

/** Credit firm receipts in bitcoin when a hybrid mortgage is coin-denominated. */
function creditFirmsBitcoin(economy: Economy, amount: number): void {
  const price = economy.bitcoinPrice;
  if (!(price > 0) || economy.firms.length === 0) {
    creditFirms(economy, amount);
    return;
  }
  const units = amount / price;
  const share = units / economy.firms.length;
  for (const firm of economy.firms) {
    creditBitcoin(economy, firm, share);
  }
}

/** Payment fee: bank equity rises and the residual falls. */
export function collectBankFee(bank: Bank, economy: Economy, fee: number): void {
  adjustBankEquity(bank, economy, fee);
}

/**
 * Dividend to depositors: equity falls and private equity rises by the same
 * amount so vault is unchanged. Household deposits at this bank rise by the
 * payout. Retained interest was never vault cash, so the payout is not limited
 * by vault.
 */
export function releaseBankEquity(bank: Bank, economy: Economy, amount: number): void {
  const payable = Math.max(0, amount);
  if (payable <= 0) {
    return;
  }
  const holders = economy.households.filter(
    (household) => household.bank === bank.id && household.deposit > 0,
  );
  if (holders.length === 0) {
    return;
  }
  const weights = holders.map((household) => Math.max(0, household.deposit));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!(totalWeight > 0)) {
    return;
  }
  adjustBankEquity(bank, economy, -payable);
  let paid = 0;
  const lastIndex = holders.length - 1;
  for (let index = 0; index < holders.length; index += 1) {
    const household = holders[index];
    if (!household) {
      continue;
    }
    const remaining = payable - paid;
    if (remaining <= 0) {
      break;
    }
    const share =
      index === lastIndex
        ? remaining
        : moneyAmount(economy, ((weights[index] ?? 0) / totalWeight) * payable);
    const take = Math.min(share, remaining);
    if (take > 0) {
      household.deposit += take;
      paid += take;
    }
  }
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
