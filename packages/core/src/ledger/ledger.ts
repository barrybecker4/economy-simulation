import { bitcoinAmountsMatch, type MoneyUnit } from '../money/amount.js';
import { auditAccounts } from './audit.js';
import {
  addTotals,
  applyLine,
  assertPostingAmount,
  compareAccountIds,
  copyAccounts,
  type Account,
} from './posting.js';
import type { AccountKind, AuditReport, PostingLine } from './types.js';

export type { AccountKind, AuditReport, EntrySide, PostingLine } from './types.js';

/**
 * One monetary unit per ledger. Fiat balances are bigint cents.
 * Bitcoin balances are floating-point satoshis and may be fractional.
 * Assets equal liabilities plus equity when the audit passes.
 */
export class Ledger {
  readonly unit: MoneyUnit;
  private accounts = new Map<string, Account>();

  constructor(unit: MoneyUnit) {
    this.unit = unit;
  }

  open(id: string, kind: AccountKind): void {
    if (id.length === 0) {
      throw new Error('Account id must not be empty');
    }
    if (this.accounts.has(id)) {
      throw new Error(`Account ${id} already exists`);
    }
    this.accounts.set(id, {
      id,
      kind,
      balance: this.unit === 'cent' ? 0n : 0,
    });
  }

  post(lines: readonly PostingLine[]): void {
    if (lines.length < 2) {
      throw new Error('A transaction needs at least two lines');
    }
    const next = copyAccounts(this.accounts);
    let debitTotal: bigint | number = this.unit === 'cent' ? 0n : 0;
    let creditTotal: bigint | number = this.unit === 'cent' ? 0n : 0;
    for (const line of lines) {
      const account = next.get(line.accountId);
      if (!account) {
        throw new Error(`Unknown account ${line.accountId}`);
      }
      assertPostingAmount(this.unit, line.amount);
      debitTotal = addTotals(debitTotal, line.side === 'debit' ? line.amount : this.zero());
      creditTotal = addTotals(creditTotal, line.side === 'credit' ? line.amount : this.zero());
      next.set(account.id, applyLine(account, line.side, line.amount));
    }
    assertTotalsMatch(debitTotal, creditTotal);
    this.accounts = next;
  }

  transfer(fromAssetId: string, toAssetId: string, amount: bigint | number): void {
    this.requireKind(fromAssetId, 'asset');
    this.requireKind(toAssetId, 'asset');
    this.post([
      { accountId: fromAssetId, side: 'credit', amount },
      { accountId: toAssetId, side: 'debit', amount },
    ]);
  }

  /** Increase a liability and the matching asset. This is how base money is issued. */
  issue(liabilityId: string, assetId: string, amount: bigint | number): void {
    this.requireKind(liabilityId, 'liability');
    this.requireKind(assetId, 'asset');
    this.post([
      { accountId: liabilityId, side: 'credit', amount },
      { accountId: assetId, side: 'debit', amount },
    ]);
  }

  redeem(liabilityId: string, assetId: string, amount: bigint | number): void {
    this.requireKind(liabilityId, 'liability');
    this.requireKind(assetId, 'asset');
    this.post([
      { accountId: liabilityId, side: 'debit', amount },
      { accountId: assetId, side: 'credit', amount },
    ]);
  }

  /** Credit equity and debit an asset. Equity is the residual in the audit identity. */
  capitalize(equityId: string, assetId: string, amount: bigint | number): void {
    this.requireKind(equityId, 'equity');
    this.requireKind(assetId, 'asset');
    this.post([
      { accountId: equityId, side: 'credit', amount },
      { accountId: assetId, side: 'debit', amount },
    ]);
  }

  balance(id: string): bigint | number {
    return this.requireAccount(id).balance;
  }

  /** Numeric ids first, in numeric order, then other ids in locale order. */
  accountIds(): string[] {
    return [...this.accounts.keys()].sort(compareAccountIds);
  }

  audit(): AuditReport {
    return auditAccounts(this.unit, this.accounts.values());
  }

  private requireAccount(id: string): Account {
    const account = this.accounts.get(id);
    if (!account) {
      throw new Error(`Unknown account ${id}`);
    }
    return account;
  }

  private requireKind(id: string, kind: AccountKind): void {
    const account = this.requireAccount(id);
    if (account.kind !== kind) {
      throw new Error(`Account ${id} is a ${account.kind}, expected ${kind}`);
    }
  }

  private zero(): bigint | number {
    return this.unit === 'cent' ? 0n : 0;
  }
}

function assertTotalsMatch(debit: bigint | number, credit: bigint | number): void {
  if (typeof debit === 'bigint' && typeof credit === 'bigint') {
    if (debit !== credit) {
      throw new Error('Debits must equal credits');
    }
    return;
  }
  if (
    typeof debit === 'number' &&
    typeof credit === 'number' &&
    bitcoinAmountsMatch(debit, credit)
  ) {
    return;
  }
  throw new Error('Debits must equal credits');
}
