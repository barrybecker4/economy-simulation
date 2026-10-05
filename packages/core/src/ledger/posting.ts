import {
  assertCentBalance,
  assertPositiveCent,
  assertPositiveSatoshi,
  type MoneyUnit,
} from '../money/amount.js';
import type { AccountKind, EntrySide } from './types.js';

export interface Account {
  id: string;
  kind: AccountKind;
  balance: bigint | number;
}

export function copyAccounts(accounts: Map<string, Account>): Map<string, Account> {
  const copy = new Map<string, Account>();
  for (const [id, account] of accounts) {
    copy.set(id, { ...account });
  }
  return copy;
}

export function applyLine(account: Account, side: EntrySide, amount: bigint | number): Account {
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

export function compareAccountIds(left: string, right: string): number {
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

export function assertPostingAmount(unit: MoneyUnit, amount: bigint | number): void {
  if (unit === 'cent') {
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

export function addTotals(total: bigint | number, amount: bigint | number): bigint | number {
  if (typeof total === 'bigint' && typeof amount === 'bigint') {
    return total + amount;
  }
  if (typeof total === 'number' && typeof amount === 'number') {
    return total + amount;
  }
  throw new Error('Mixed fiat and bitcoin amounts');
}
