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

/** Dividend: bank equity falls and the residual rises. */
export function releaseBankEquity(bank: Bank, economy: Economy, amount: number): void {
  bank.equity -= amount;
  economy.privateEquity += amount;
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
 * The house is not a ledger account. The deposit leaves the banking system.
 * Vault cash and bank equity stay put, so the private-equity residual does not move.
 */
export function payCashForHome(household: Household, price: number): void {
  household.deposit -= price;
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

export function injectBankCapital(bank: Bank, amount: number): void {
  bank.equity += amount;
  bank.vault += amount;
  bank.reserves += amount;
}

export function addReserves(bank: Bank, amount: number): void {
  bank.reserves += amount;
}

export function clearBonds(bank: Bank): void {
  bank.bonds = 0;
}

export function resetFailedFirmAccounts(firm: Firm, deposit: number): void {
  firm.loan = 0;
  firm.deposit = deposit;
}
