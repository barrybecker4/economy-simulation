import type { EntrySide } from '../ledger/ledger.js';
import { Ledger } from '../ledger/ledger.js';
import {
  BITCOIN_AUDIT_ABSOLUTE_EPSILON,
  BITCOIN_AUDIT_RELATIVE_EPSILON,
  bitcoinAmountsMatch,
  exactCentSum,
  type MoneyUnit,
} from '../money/amount.js';
import { centAggregates, centIdentityGap, totalDeposits, totalLoans } from './banking.js';
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
  if (ledger.unit === 'cent') {
    postCentStocks(economy, ledger);
    return;
  }
  const deposits = totalDeposits(economy);
  const loans = totalLoans(economy);
  const reserves = sumBank(economy, (bank) => bank.reserves);
  const bonds = sumBank(economy, (bank) => bank.bonds + Number(bank.bondsOver));
  const vault = sumBank(economy, (bank) => bank.vault);
  const equity = sumBank(economy, (bank) => bank.equity);
  alignPrivateEquity(economy, ledger.unit, vault, equity);
  assertBankBalance(economy, ledger.unit, deposits, loans, reserves, bonds, vault, equity);
  const targets = roundedStockTargets(ledger.unit, deposits, loans, reserves, bonds, vault, equity);
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
  const bonds = sumBank(economy, (bank) => bank.bonds + Number(bank.bondsOver));
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

function postCentStocks(economy: Economy, ledger: Ledger): void {
  const stocks = centAggregates(economy);
  const residual = stocks.vault - stocks.equity;
  alignPrivateEquityCents(economy, residual);
  assertCentBooks(economy);
  const targets = new Map<string, bigint>([
    ['deposits', stocks.deposits],
    ['bank-deposits', stocks.deposits],
    ['bank-loans', stocks.loans],
    ['borrower-loans', stocks.loans],
    ['reserves', stocks.reserves],
    ['cb-base', stocks.reserves],
    ['bonds', stocks.bonds],
    ['gov-bonds', stocks.bonds],
    ['vault', stocks.vault],
    ['bank-equity', stocks.equity],
    ['private-equity', residual],
  ]);
  postBalancedStockLines(ledger, centStockLines(ledger, targets));
}

function alignPrivateEquityCents(economy: Economy, residual: bigint): void {
  const kept = exactCentSum([economy.privateEquity]);
  const gap = kept - residual;
  if (gap > 1n || gap < -1n) {
    throw new Error(
      `Private equity ${economy.privateEquity} does not match vault minus bank equity ${residual}`,
    );
  }
  if (residual > BigInt(Number.MAX_SAFE_INTEGER) || residual < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Private equity exceeds the safe integer range');
  }
  economy.privateEquity = Number(residual);
}

function assertCentBooks(economy: Economy): void {
  const gap = centIdentityGap(economy);
  if (gap <= 1n && gap >= -1n) {
    return;
  }
  throw new Error(`Bank books do not close at tick ${economy.tick}: cent gap ${gap}`);
}

function centStockLines(
  ledger: Ledger,
  targets: ReadonlyMap<string, bigint>,
): { accountId: string; side: EntrySide; amount: bigint }[] {
  const lines: { accountId: string; side: EntrySide; amount: bigint }[] = [];
  for (const account of ACCOUNTS) {
    const target = targets.get(account.id);
    if (target === undefined) {
      throw new Error(`Missing stock target for ${account.id}`);
    }
    const current = ledger.balance(account.id);
    if (typeof current !== 'bigint') {
      throw new Error(`Account ${account.id} is not a cent balance`);
    }
    const delta = target - current;
    if (delta === 0n) {
      continue;
    }
    const increase = delta > 0n;
    const side: EntrySide =
      account.kind === 'asset' ? (increase ? 'debit' : 'credit') : increase ? 'credit' : 'debit';
    lines.push({ accountId: account.id, side, amount: delta > 0n ? delta : -delta });
  }
  return lines;
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
