import type { EntrySide } from '../ledger/ledger.js';
import { Ledger } from '../ledger/ledger.js';
import type { Economy } from './economy.js';
import { equityFor, loansAt, moneyAmount, totalDeposits, totalLoans } from './helpers.js';
import { clamp } from './stats.js';
import type { Bank, Firm, Household } from './types.js';

/** Household, firm, or agent cash balance. */
export interface DepositAccount {
  deposit: number;
}

const ACCOUNTS: { id: string; kind: 'asset' | 'liability' | 'equity' }[] = [
  { id: 'deposits', kind: 'asset' },
  { id: 'bank-deposits', kind: 'liability' },
  { id: 'bank-loans', kind: 'asset' },
  { id: 'borrower-loans', kind: 'liability' },
  { id: 'reserves', kind: 'asset' },
  { id: 'cb-base', kind: 'liability' },
  { id: 'bonds', kind: 'asset' },
  { id: 'gov-bonds', kind: 'liability' },
  { id: 'vault', kind: 'asset' },
  { id: 'bank-equity', kind: 'equity' },
  { id: 'private-equity', kind: 'equity' },
];

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

export function payCashForHome(household: Household, economy: Economy, price: number): void {
  household.deposit -= price;
  economy.privateEquity += price;
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

export function issueBonds(economy: Economy, amount: number): void {
  if (amount <= 0) {
    return;
  }
  economy.govDeposits += amount;
  const purchaseShare =
    economy.params.regime === 'fiat' ? clamp(economy.params.bondPurchaseShare, 0, 1) : 0;
  const monetized = moneyAmount(economy, amount * purchaseShare);
  const bankShare = amount - monetized;
  const buyer = economy.banks[0];
  if (buyer && bankShare > 0) {
    buyer.bonds += bankShare;
  }
  if (buyer && monetized > 0) {
    buyer.bonds += monetized;
    buyer.reserves += monetized;
  }
}

export function capitalizeBanks(economy: Economy): void {
  const deposits = totalDeposits(economy);
  for (const bank of economy.banks) {
    const equity = equityFor(economy, loansAt(economy, bank.id));
    bank.vault = equity;
    bank.equity = equity;
    bank.reserves = Math.round(
      economy.params.reserveRequirement * (deposits / economy.banks.length),
    );
  }
  economy.privateEquity = 0;
}

export function ensureOpen(economy: Economy, ledger: Ledger): void {
  if (economy.ready) {
    return;
  }
  economy.ledger = ledger;
  for (const account of ACCOUNTS) {
    ledger.open(account.id, account.kind);
  }
  economy.ready = true;
  postStocks(economy, ledger);
}

export function postStocks(economy: Economy, ledger: Ledger): void {
  const deposits = totalDeposits(economy);
  const loans = totalLoans(economy);
  const reserves = economy.banks.reduce((sum, bank) => sum + bank.reserves, 0);
  const bonds = economy.banks.reduce((sum, bank) => sum + bank.bonds, 0);
  const vault = economy.banks.reduce((sum, bank) => sum + bank.vault, 0);
  const equity = economy.banks.reduce((sum, bank) => sum + bank.equity, 0);
  // Vault cash equals bank equity plus this residual. Re-seat it each post so
  // floating-point interest and fees cannot unbalance the stock journal.
  economy.privateEquity = vault - equity;
  const targets = new Map<string, number>([
    ['deposits', deposits],
    ['bank-deposits', deposits],
    ['bank-loans', loans],
    ['borrower-loans', loans],
    ['reserves', reserves],
    ['cb-base', reserves],
    ['bonds', bonds],
    ['gov-bonds', bonds],
    ['vault', vault],
    ['bank-equity', equity],
    ['private-equity', economy.privateEquity],
  ]);
  const lines: { accountId: string; side: EntrySide; amount: bigint | number }[] = [];
  for (const account of ACCOUNTS) {
    const raw = targets.get(account.id) ?? 0;
    const target = ledger.unit === 'cent' ? Math.round(raw) : raw;
    const current = Number(ledger.balance(account.id));
    const delta = target - current;
    if (delta === 0 || Math.abs(delta) < 1e-9) {
      continue;
    }
    const increase = delta > 0;
    const side: EntrySide =
      account.kind === 'asset' ? (increase ? 'debit' : 'credit') : increase ? 'credit' : 'debit';
    const amount = ledger.unit === 'cent' ? BigInt(Math.abs(Math.round(delta))) : Math.abs(delta);
    lines.push({ accountId: account.id, side, amount });
  }
  postBalancedStockLines(ledger, lines);
}

/** Post stock lines, rejecting a one-sided journal. */
export function postBalancedStockLines(
  ledger: Ledger,
  lines: readonly { accountId: string; side: EntrySide; amount: bigint | number }[],
): void {
  if (lines.length === 1) {
    throw new Error('Stock journal moved only one account; a balanced change needs at least two');
  }
  if (lines.length >= 2) {
    ledger.post(lines);
  }
}
