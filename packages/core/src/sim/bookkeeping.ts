import type { EntrySide } from '../ledger/ledger.js';
import { Ledger } from '../ledger/ledger.js';
import type { TickContext } from '../engine/engine.js';
import { FAILURE_TICKS, INITIAL_WAGE, SHOCK_PHASE_MONTHS } from './rules.js';
import type { Economy } from './economy.js';
import type { Firm } from './types.js';
import { equityFor, loansAt, totalDeposits, totalLoans } from './helpers.js';

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

export function onBookkeeping(economy: Economy, ctx: TickContext): void {
  postStocks(economy, ctx.ledger);
  for (const bank of economy.banks) {
    if (!bank.failed && bank.equity <= 0) {
      bank.failed = true;
      economy.cumulativeFailures += 1;
    }
  }
  for (const firm of economy.firms) {
    const equity = firm.deposit + firm.capital * firm.price - firm.loan;
    firm.negTicks = equity < 0 ? firm.negTicks + 1 : 0;
    if (firm.negTicks >= FAILURE_TICKS) {
      replaceFirm(economy, firm);
    }
  }
  trackCreditCycle(economy);
  const audit = ctx.ledger.audit();
  if (!audit.ok) {
    throw new Error(`Ledger audit failed at tick ${ctx.tick}: imbalance ${audit.imbalance}`);
  }
}

function replaceFirm(economy: Economy, firm: Firm): void {
  economy.defaultsThisTick += firm.loan;
  const bank = economy.banks[firm.bank];
  if (bank) {
    bank.equity -= firm.loan;
  }
  economy.privateEquity += firm.loan;
  for (const workerId of firm.workers) {
    const worker = economy.households[workerId];
    if (worker) {
      worker.employer = -1;
    }
  }
  firm.workers = [];
  firm.loan = 0;
  firm.deposit = INITIAL_WAGE;
  firm.capital = 1;
  firm.inventory = 1;
  firm.price = economy.priceLevel;
  firm.negTicks = 0;
  firm.productivity = 1;
}

function trackCreditCycle(economy: Economy): void {
  const credit = totalLoans(economy);
  economy.creditHistory.push(credit);
  if (!economy.sawBoom && economy.creditHistory.length > 30) {
    const recent = economy.creditHistory.slice(-24);
    const start = recent[0] ?? credit;
    const mid = recent[11] ?? credit;
    const end = recent[recent.length - 1] ?? credit;
    if (mid > start * 1.02 && end < mid) {
      economy.sawBoom = true;
      economy.boomLength = SHOCK_PHASE_MONTHS;
      economy.bustLength = SHOCK_PHASE_MONTHS;
    }
  }
}
