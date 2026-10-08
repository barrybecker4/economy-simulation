import type { EntrySide } from '../ledger/ledger.js';
import { Ledger } from '../ledger/ledger.js';
import {
  BITCOIN_AUDIT_ABSOLUTE_EPSILON,
  BITCOIN_AUDIT_RELATIVE_EPSILON,
  bitcoinAmountsMatch,
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
  const targets = roundedStockTargets(
    ledger.unit,
    deposits,
    loans,
    reserves,
    bonds,
    vault,
    equity,
    economy.privateEquity,
  );
  const seatedPrivateEquity = postBalancedStockLines(ledger, stockLines(ledger, targets));
  // Seating can nudge the ledger residual by float dust. Keep the economy on
  // vault − equity unless that nudge stays inside the unit tolerance.
  if (
    seatedPrivateEquity !== undefined &&
    residualMatches(ledger.unit, seatedPrivateEquity, vault - equity)
  ) {
    economy.privateEquity = seatedPrivateEquity;
  }
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

type StockLine = { accountId: string; side: EntrySide; amount: bigint | number };

/**
 * Post stock lines. A lone dust line is dropped; a balanced change posts.
 * For satoshi journals, returns the ledger private-equity balance after seating
 * so the economy residual stays aligned with the book.
 */
export function postBalancedStockLines(
  ledger: Ledger,
  lines: readonly StockLine[],
): number | undefined {
  let kept = lines.filter((line) => keepStockAmount(ledger.unit, line.amount));
  if (ledger.unit === 'satoshi') {
    kept = seatSatoshiStockResidual(kept);
  }
  if (kept.length >= 2) {
    ledger.post(kept);
  }
  if (ledger.unit !== 'satoshi' || !ledger.accountIds().includes('private-equity')) {
    return undefined;
  }
  return Number(ledger.balance('private-equity'));
}

/**
 * Float drift between vault, bank equity, and private equity can leave satoshi
 * stock deltas that are opposite but not bit-identical. Seat the imbalance on
 * private-equity (the vault residual) so the journal passes debit=credit. When
 * that line was filtered as dust, create it.
 */
function seatSatoshiStockResidual(lines: readonly StockLine[]): StockLine[] {
  if (lines.length < 1) {
    return [...lines];
  }
  const { debit, credit } = stockSideTotals(lines);
  if (bitcoinAmountsMatch(debit, credit)) {
    return [...lines];
  }
  const gap = debit - credit;
  const seated = lines.map((line) => ({ ...line }));
  const peIndex = seated.findIndex((line) => line.accountId === 'private-equity');
  if (peIndex < 0) {
    // Debit excess needs a credit on equity; credit excess needs a debit.
    // Create the line even for sub-dust gaps so debit=credit still holds at
    // the posting epsilon after the keep filter dropped private-equity.
    seated.push({
      accountId: 'private-equity',
      side: gap > 0 ? 'credit' : 'debit',
      amount: Math.abs(gap),
    });
    return seated;
  }
  const pe = seated[peIndex];
  if (!pe || typeof pe.amount !== 'number') {
    return seated;
  }
  let amount = pe.side === 'credit' ? pe.amount + gap : pe.amount - gap;
  let side = pe.side;
  if (amount < 0) {
    amount = -amount;
    side = side === 'credit' ? 'debit' : 'credit';
  }
  if (amount <= BITCOIN_AUDIT_ABSOLUTE_EPSILON) {
    seated.splice(peIndex, 1);
    return seatSatoshiStockResidual(seated);
  }
  seated[peIndex] = { accountId: pe.accountId, side, amount };
  return seated;
}

function stockSideTotals(lines: readonly StockLine[]): { debit: number; credit: number } {
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    const amount = Number(line.amount);
    if (line.side === 'debit') {
      debit += amount;
    } else {
      credit += amount;
    }
  }
  return { debit, credit };
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

/**
 * Build stock targets. Private equity is the vault residual so
 * vault = bank equity + private equity. For cents, round each paired stock
 * once first (independent Math.round on half-cents can break that identity).
 */
export function roundedStockTargets(
  unit: MoneyUnit,
  deposits: number,
  loans: number,
  reserves: number,
  bonds: number,
  vault: number,
  equity: number,
  _privateEquity: number,
): Map<string, number> {
  if (unit !== 'cent') {
    return stockTargets(deposits, loans, reserves, bonds, vault, equity, vault - equity);
  }
  const roundDeposits = Math.round(deposits);
  const roundLoans = Math.round(loans);
  const roundReserves = Math.round(reserves);
  const roundBonds = Math.round(bonds);
  const roundVault = Math.round(vault);
  const roundEquity = Math.round(equity);
  return stockTargets(
    roundDeposits,
    roundLoans,
    roundReserves,
    roundBonds,
    roundVault,
    roundEquity,
    roundVault - roundEquity,
  );
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
  return withinUnitTolerance(
    unit,
    kept - residual,
    Math.max(1, Math.abs(kept), Math.abs(residual)),
  );
}

function withinUnitTolerance(unit: MoneyUnit, gap: number, scale: number): boolean {
  if (unit === 'cent') {
    // Allow a full cent so half-cent floats that round apart still close.
    return Math.abs(gap) <= 1;
  }
  const tolerance = Math.max(
    BITCOIN_AUDIT_ABSOLUTE_EPSILON,
    BITCOIN_AUDIT_RELATIVE_EPSILON * scale,
  );
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
  const target = targets.get(account.id);
  if (target === undefined) {
    throw new Error(`Missing stock target for ${account.id}`);
  }
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
