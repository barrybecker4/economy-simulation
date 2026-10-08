import type { Economy } from './economy.js';
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
  bank.equity += coupon;
  economy.privateEquity -= coupon;
}

export function payFirmInterest(firm: Firm, bank: Bank, economy: Economy, interest: number): void {
  firm.deposit -= interest;
  bank.equity += interest;
  economy.privateEquity -= interest;
}

export function drawMortgage(household: Household, principal: number): void {
  household.mortgage = principal;
  household.deposit += principal;
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
  bank.equity += fee;
  economy.privateEquity -= fee;
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
  if (bank) {
    bank.equity -= loss;
  }
  economy.privateEquity += loss;
}

export function writeOffFirmLoan(
  firm: Firm,
  bank: Bank | undefined,
  economy: Economy,
  loss: number,
): void {
  firm.loan -= loss;
  if (bank) {
    bank.equity -= loss;
  }
  economy.privateEquity += loss;
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
  bank.equity -= interest;
  household.deposit += interest;
  economy.privateEquity += interest;
}

/**
 * Fiat central-bank cover: reserves and equity rise together, and private equity
 * falls so vault still equals equity plus private equity. Vault itself is unchanged.
 */
export function subsidizeDepositInterest(bank: Bank, economy: Economy, amount: number): void {
  if (amount <= 0) {
    return;
  }
  bank.equity += amount;
  bank.reserves += amount;
  economy.privateEquity -= amount;
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
  bank.reserves += bank.bonds;
  bank.bonds = 0;
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
