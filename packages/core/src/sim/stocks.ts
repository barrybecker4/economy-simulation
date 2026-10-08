import type { EntrySide } from '../ledger/ledger.js';
import { Ledger } from '../ledger/ledger.js';
import {
  BITCOIN_AUDIT_ABSOLUTE_EPSILON,
  BITCOIN_AUDIT_RELATIVE_EPSILON,
  type MoneyUnit,
} from '../money/amount.js';
import { totalDeposits, totalLoans } from './banking.js';
import type { Economy } from './economy.js';

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

export function ensureOpen(economy: Economy, ledger: Ledger): void {
  if (economy.ready) {
    return;
  }
  for (const account of ACCOUNTS) {
    ledger.open(account.id, account.kind);
  }
  economy.ready = true;
  postStocks(economy, ledger);
}

export function postStocks(economy: Economy, ledger: Ledger): void {
  const deposits = totalDeposits(economy);
  const loans = totalLoans(economy);
  const reserves = sumBank(economy, (bank) => bank.reserves);
  const bonds = sumBank(economy, (bank) => bank.bonds);
  const vault = sumBank(economy, (bank) => bank.vault);
  const equity = sumBank(economy, (bank) => bank.equity);
  alignPrivateEquity(economy, ledger.unit, vault, equity);
  assertBankBalance(economy, ledger.unit, deposits, loans, reserves, bonds, vault, equity);
  const targets = stockTargets(
    deposits,
    loans,
    reserves,
    bonds,
    vault,
    equity,
    economy.privateEquity,
  );
  postBalancedStockLines(ledger, stockLines(ledger, targets));
}

/**
 * Bank assets minus deposit liabilities and equity. Zero when books close.
 * loans + reserves + bonds + vault = deposits + bank equity
 * Private equity is the vault residual (vault − equity) and is audited separately.
 */
export function bankBalanceIdentity(economy: Economy): number {
  const deposits = totalDeposits(economy);
  const loans = totalLoans(economy);
  const reserves = sumBank(economy, (bank) => bank.reserves);
  const bonds = sumBank(economy, (bank) => bank.bonds);
  const vault = sumBank(economy, (bank) => bank.vault);
  const equity = sumBank(economy, (bank) => bank.equity);
  return loans + reserves + bonds + vault - deposits - equity;
}

/** Post stock lines. A lone dust line is dropped; a balanced change posts. */
export function postBalancedStockLines(
  ledger: Ledger,
  lines: readonly { accountId: string; side: EntrySide; amount: bigint | number }[],
): void {
  const kept = lines.filter((line) => keepStockAmount(ledger.unit, line.amount));
  if (kept.length >= 2) {
    ledger.post(kept);
  }
}

function keepStockAmount(unit: MoneyUnit, amount: bigint | number): boolean {
  if (unit === 'cent') {
    return typeof amount === 'bigint' ? amount !== 0n : Math.round(Math.abs(amount)) !== 0;
  }
  return Math.abs(Number(amount)) > BITCOIN_AUDIT_ABSOLUTE_EPSILON;
}

function sumBank(economy: Economy, read: (bank: Economy['banks'][number]) => number): number {
  return economy.banks.reduce((sum, bank) => sum + read(bank), 0);
}

function stockTargets(
  deposits: number,
  loans: number,
  reserves: number,
  bonds: number,
  vault: number,
  equity: number,
  privateEquity: number,
): Map<string, number> {
  return new Map<string, number>([
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
    ['private-equity', privateEquity],
  ]);
}

/**
 * Vault cash is bank equity plus the private-equity residual. A large gap is an
 * accounting error. Dust inside the unit's tolerance is seated so the journal balances.
 */
function alignPrivateEquity(
  economy: Economy,
  unit: MoneyUnit,
  vault: number,
  equity: number,
): void {
  const residual = vault - equity;
  if (!residualMatches(unit, economy.privateEquity, residual)) {
    throw new Error(
      `Private equity ${economy.privateEquity} does not match vault ${vault} minus bank equity ${equity}`,
    );
  }
  economy.privateEquity = residual;
}

function assertBankBalance(
  economy: Economy,
  unit: MoneyUnit,
  deposits: number,
  loans: number,
  reserves: number,
  bonds: number,
  vault: number,
  equity: number,
): void {
  const assets = loans + reserves + bonds + vault;
  const claims = deposits + equity;
  const gap = assets - claims;
  if (withinUnitTolerance(unit, gap, Math.max(1, Math.abs(deposits), Math.abs(loans)))) {
    return;
  }
  throw new Error(
    `Bank books do not close at tick ${economy.tick}: assets ${assets} vs deposits plus equity ${claims}`,
  );
}

function residualMatches(unit: MoneyUnit, kept: number, residual: number): boolean {
  return withinUnitTolerance(unit, kept - residual, Math.max(1, Math.abs(kept), Math.abs(residual)));
}

function withinUnitTolerance(unit: MoneyUnit, gap: number, scale: number): boolean {
  if (unit === 'cent') {
    return Math.abs(gap) < 0.5;
  }
  const tolerance = Math.max(BITCOIN_AUDIT_ABSOLUTE_EPSILON, BITCOIN_AUDIT_RELATIVE_EPSILON * scale);
  return Math.abs(gap) <= tolerance;
}

function stockLines(
  ledger: Ledger,
  targets: ReadonlyMap<string, number>,
): { accountId: string; side: EntrySide; amount: bigint | number }[] {
  const lines: { accountId: string; side: EntrySide; amount: bigint | number }[] = [];
  for (const account of ACCOUNTS) {
    const line = stockLine(ledger, account, targets);
    if (line) {
      lines.push(line);
    }
  }
  return lines;
}

function stockLine(
  ledger: Ledger,
  account: (typeof ACCOUNTS)[number],
  targets: ReadonlyMap<string, number>,
): { accountId: string; side: EntrySide; amount: bigint | number } | undefined {
  const raw = targets.get(account.id);
  if (raw === undefined) {
    throw new Error(`Missing stock target for ${account.id}`);
  }
  const target = ledger.unit === 'cent' ? Math.round(raw) : raw;
  const delta = target - Number(ledger.balance(account.id));
  const amount = postingAmount(ledger.unit, delta);
  if (amount === undefined) {
    return undefined;
  }
  const increase = delta > 0;
  const side: EntrySide =
    account.kind === 'asset' ? (increase ? 'debit' : 'credit') : increase ? 'credit' : 'debit';
  return { accountId: account.id, side, amount };
}

function postingAmount(unit: MoneyUnit, delta: number): bigint | number | undefined {
  if (unit === 'cent') {
    const cents = Math.round(Math.abs(delta));
    return cents === 0 ? undefined : BigInt(cents);
  }
  const amount = Math.abs(delta);
  return amount <= BITCOIN_AUDIT_ABSOLUTE_EPSILON ? undefined : amount;
}
