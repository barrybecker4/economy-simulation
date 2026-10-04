import {
  assertCentBalance,
  assertPositiveCent,
  assertPositiveSatoshi,
  bitcoinAmountsMatch,
  bitcoinImbalanceOk,
  formatCanonicalNumber,
  type MoneyUnit,
} from '../money/amount.js';

export type AccountKind = 'asset' | 'liability' | 'equity';
export type EntrySide = 'debit' | 'credit';

export interface PostingLine {
  accountId: string;
  side: EntrySide;
  amount: bigint | number;
}

export interface AuditReport {
  unit: MoneyUnit;
  ok: boolean;
  assets: string;
  liabilities: string;
  equity: string;
  imbalance: string;
}

interface Account {
  id: string;
  kind: AccountKind;
  balance: bigint | number;
}

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
    let debitTotal = this.zero();
    let creditTotal = this.zero();
    for (const line of lines) {
      const account = next.get(line.accountId);
      if (!account) {
        throw new Error(`Unknown account ${line.accountId}`);
      }
      this.assertAmount(line.amount);
      debitTotal = this.addTotals(debitTotal, line.side === 'debit' ? line.amount : this.zero());
      creditTotal = this.addTotals(creditTotal, line.side === 'credit' ? line.amount : this.zero());
      const updated = applyLine(account, line.side, line.amount);
      next.set(account.id, updated);
    }
    this.assertTotalsMatch(debitTotal, creditTotal);
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
    if (this.unit === 'cent') {
      return this.auditCents();
    }
    return this.auditSatoshis();
  }

  private auditCents(): AuditReport {
    let assets = 0n;
    let liabilities = 0n;
    let equity = 0n;
    for (const account of this.accounts.values()) {
      if (typeof account.balance !== 'bigint') {
        throw new Error(`Account ${account.id} is not a cent balance`);
      }
      if (account.kind === 'asset') {
        assets += account.balance;
      } else if (account.kind === 'liability') {
        liabilities += account.balance;
      } else {
        equity += account.balance;
      }
    }
    const imbalance = assets - liabilities - equity;
    return {
      unit: 'cent',
      ok: imbalance === 0n,
      assets: assets.toString(),
      liabilities: liabilities.toString(),
      equity: equity.toString(),
      imbalance: imbalance.toString(),
    };
  }

  private auditSatoshis(): AuditReport {
    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    for (const account of this.accounts.values()) {
      if (typeof account.balance !== 'number') {
        throw new Error(`Account ${account.id} is not a satoshi balance`);
      }
      if (account.kind === 'asset') {
        assets += account.balance;
      } else if (account.kind === 'liability') {
        liabilities += account.balance;
      } else {
        equity += account.balance;
      }
    }
    const imbalance = assets - liabilities - equity;
    return {
      unit: 'satoshi',
      ok: bitcoinImbalanceOk(assets, liabilities, equity),
      assets: formatCanonicalNumber(assets),
      liabilities: formatCanonicalNumber(liabilities),
      equity: formatCanonicalNumber(equity),
      imbalance: formatCanonicalNumber(imbalance),
    };
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

  private assertAmount(amount: bigint | number): void {
    if (this.unit === 'cent') {
      if (typeof amount !== 'bigint') {
        throw new Error('Fiat amounts must be bigint cents');
      }
      assertPositiveCent(amount);
      return;
    }
    if (typeof amount !== 'number') {
      throw new Error('Bitcoin amounts must be numbers of satoshis');
    }
    assertPositiveSatoshi(amount);
  }

  private zero(): bigint | number {
    return this.unit === 'cent' ? 0n : 0;
  }

  private addTotals(total: bigint | number, amount: bigint | number): bigint | number {
    if (typeof total === 'bigint' && typeof amount === 'bigint') {
      return total + amount;
    }
    if (typeof total === 'number' && typeof amount === 'number') {
      return total + amount;
    }
    throw new Error('Mixed fiat and bitcoin amounts');
  }

  private assertTotalsMatch(debit: bigint | number, credit: bigint | number): void {
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
}

function copyAccounts(accounts: Map<string, Account>): Map<string, Account> {
  const copy = new Map<string, Account>();
  for (const [id, account] of accounts) {
    copy.set(id, { ...account });
  }
  return copy;
}

function applyLine(account: Account, side: EntrySide, amount: bigint | number): Account {
  const increase =
    (account.kind === 'asset' && side === 'debit') ||
    (account.kind !== 'asset' && side === 'credit');
  if (typeof account.balance === 'bigint' && typeof amount === 'bigint') {
    const next = increase ? account.balance + amount : account.balance - amount;
    if (account.kind === 'asset' && next < 0n) {
      throw new Error(`Account ${account.id} has insufficient balance`);
    }
    assertCentBalance(next);
    return { ...account, balance: next };
  }
  if (typeof account.balance === 'number' && typeof amount === 'number') {
    const next = increase ? account.balance + amount : account.balance - amount;
    if (!Number.isFinite(next)) {
      throw new Error(`Account ${account.id} balance is not finite`);
    }
    if (account.kind === 'asset' && next < -1e-9) {
      throw new Error(`Account ${account.id} has insufficient balance`);
    }
    if (account.kind === 'asset' && next < 0) {
      return { ...account, balance: 0 };
    }
    return { ...account, balance: next };
  }
  throw new Error('Mixed fiat and bitcoin amounts');
}

function compareAccountIds(left: string, right: string): number {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const leftValue = BigInt(left);
    const rightValue = BigInt(right);
    if (leftValue < rightValue) {
      return -1;
    }
    if (leftValue > rightValue) {
      return 1;
    }
    return 0;
  }
  if (leftNumeric) {
    return -1;
  }
  if (rightNumeric) {
    return 1;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
