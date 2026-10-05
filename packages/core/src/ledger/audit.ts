import { bitcoinImbalanceOk, formatCanonicalNumber, type MoneyUnit } from '../money/amount.js';
import type { Account } from './posting.js';
import type { AccountKind, AuditReport } from './types.js';

function addByKind(
  accounts: Iterable<Account>,
  expect: 'bigint' | 'number',
  add: (kind: AccountKind, balance: bigint | number) => void,
): void {
  for (const account of accounts) {
    if (expect === 'bigint' && typeof account.balance !== 'bigint') {
      throw new Error(`Account ${account.id} is not a cent balance`);
    }
    if (expect === 'number' && typeof account.balance !== 'number') {
      throw new Error(`Account ${account.id} is not a satoshi balance`);
    }
    add(account.kind, account.balance);
  }
}

export function auditCents(accounts: Iterable<Account>): AuditReport {
  let assets = 0n;
  let liabilities = 0n;
  let equity = 0n;
  addByKind(accounts, 'bigint', (kind, balance) => {
    const value = balance as bigint;
    if (kind === 'asset') {
      assets += value;
    } else if (kind === 'liability') {
      liabilities += value;
    } else {
      equity += value;
    }
  });
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

export function auditSatoshis(accounts: Iterable<Account>): AuditReport {
  let assets = 0;
  let liabilities = 0;
  let equity = 0;
  addByKind(accounts, 'number', (kind, balance) => {
    const value = balance as number;
    if (kind === 'asset') {
      assets += value;
    } else if (kind === 'liability') {
      liabilities += value;
    } else {
      equity += value;
    }
  });
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

export function auditAccounts(unit: MoneyUnit, accounts: Iterable<Account>): AuditReport {
  return unit === 'cent' ? auditCents(accounts) : auditSatoshis(accounts);
}
