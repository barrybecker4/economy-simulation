import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MAX_CENT } from '../money/amount.js';
import { Ledger } from './ledger.js';

describe('Ledger', () => {
  it('audits an empty book', () => {
    expect(new Ledger('cent').audit().ok).toBe(true);
    expect(new Ledger('satoshi').audit().ok).toBe(true);
  });

  it('keeps fiat issuance, transfer, equity, and redemption in balance', () => {
    const ledger = new Ledger('cent');
    ledger.open('issuer', 'liability');
    ledger.open('equity', 'equity');
    ledger.open('alice', 'asset');
    ledger.open('bob', 'asset');
    ledger.issue('issuer', 'alice', 100n);
    ledger.capitalize('equity', 'alice', 40n);
    ledger.transfer('alice', 'bob', 25n);
    ledger.redeem('issuer', 'alice', 10n);
    expect(ledger.balance('alice')).toBe(105n);
    expect(ledger.balance('bob')).toBe(25n);
    expect(ledger.audit()).toMatchObject({ ok: true, imbalance: '0' });
  });

  it('stores a fraction of a satoshi', () => {
    const ledger = new Ledger('satoshi');
    ledger.open('issuer', 'liability');
    ledger.open('holder', 'asset');
    ledger.issue('issuer', 'holder', 1e-15);
    expect(ledger.balance('holder')).toBe(1e-15);
    expect(ledger.audit().ok).toBe(true);
  });

  it('rejects an unbalanced post without changing balances', () => {
    const ledger = new Ledger('cent');
    ledger.open('alice', 'asset');
    ledger.open('bob', 'asset');
    ledger.open('issuer', 'liability');
    ledger.issue('issuer', 'alice', 20n);
    expect(() =>
      ledger.post([
        { accountId: 'alice', side: 'credit', amount: 10n },
        { accountId: 'bob', side: 'debit', amount: 4n },
      ]),
    ).toThrow(/Debits must equal credits/);
    expect(ledger.balance('alice')).toBe(20n);
    expect(ledger.balance('bob')).toBe(0n);
    expect(ledger.audit().ok).toBe(true);
  });

  it('rejects a fiat amount outside the safe integer range', () => {
    const ledger = new Ledger('cent');
    ledger.open('issuer', 'liability');
    ledger.open('holder', 'asset');
    expect(() => ledger.issue('issuer', 'holder', MAX_CENT + 1n)).toThrow(/safe integer/);
    ledger.issue('issuer', 'holder', MAX_CENT);
    expect(() => ledger.issue('issuer', 'holder', 1n)).toThrow(/safe integer/);
    expect(ledger.balance('holder')).toBe(MAX_CENT);
    expect(ledger.audit().ok).toBe(true);
  });

  it('sorts numeric account ids by value', () => {
    const ledger = new Ledger('cent');
    ledger.open('10', 'asset');
    ledger.open('2', 'asset');
    ledger.open('bank', 'liability');
    ledger.open('1', 'asset');
    expect(ledger.accountIds()).toEqual(['1', '2', '10', 'bank']);
  });

  it('keeps random fiat transfers on the audit identity', () => {
    fc.assert(
      fc.property(fiatOps(), (ops) => {
        const ledger = openFiatBook();
        for (const op of ops) {
          applyFiatOp(ledger, op);
        }
        expect(ledger.audit().ok).toBe(true);
      }),
      { seed: 20261003, numRuns: 50 },
    );
  });

  it('keeps random fractional satoshi transfers on the audit identity', () => {
    fc.assert(
      fc.property(bitcoinOps(), (ops) => {
        const ledger = openBitcoinBook();
        for (const op of ops) {
          applyBitcoinOp(ledger, op);
        }
        expect(ledger.audit().ok).toBe(true);
      }),
      { seed: 20261003, numRuns: 50 },
    );
  });
});

interface FiatOp {
  kind: 'issue' | 'transfer' | 'redeem';
  from: number;
  to: number;
  amount: number;
}

interface BitcoinOp {
  kind: 'issue' | 'transfer' | 'redeem';
  from: number;
  to: number;
  amount: number;
}

function fiatOps(): fc.Arbitrary<FiatOp[]> {
  return fc.array(
    fc.record({
      kind: fc.constantFrom('issue', 'transfer', 'redeem'),
      from: fc.integer({ min: 0, max: 3 }),
      to: fc.integer({ min: 0, max: 3 }),
      amount: fc.integer({ min: 1, max: 10_000 }),
    }),
    { minLength: 0, maxLength: 40 },
  );
}

function bitcoinOps(): fc.Arbitrary<BitcoinOp[]> {
  return fc.array(
    fc.record({
      kind: fc.constantFrom('issue', 'transfer', 'redeem'),
      from: fc.integer({ min: 0, max: 3 }),
      to: fc.integer({ min: 0, max: 3 }),
      amount: fc.double({ min: 1e-8, max: 100, noNaN: true }),
    }),
    { minLength: 0, maxLength: 40 },
  );
}

function openFiatBook(): Ledger {
  const ledger = new Ledger('cent');
  ledger.open('issuer', 'liability');
  for (let index = 0; index < 4; index += 1) {
    ledger.open(String(index), 'asset');
  }
  return ledger;
}

function openBitcoinBook(): Ledger {
  const ledger = new Ledger('satoshi');
  ledger.open('issuer', 'liability');
  for (let index = 0; index < 4; index += 1) {
    ledger.open(String(index), 'asset');
  }
  return ledger;
}

function applyFiatOp(ledger: Ledger, op: FiatOp): void {
  const amount = BigInt(op.amount);
  const from = String(op.from);
  const to = String(op.to);
  if (op.kind === 'issue') {
    ledger.issue('issuer', from, amount);
    return;
  }
  if (op.kind === 'transfer') {
    if (from === to) {
      return;
    }
    const balance = ledger.balance(from);
    if (typeof balance === 'bigint' && balance >= amount) {
      ledger.transfer(from, to, amount);
    }
    return;
  }
  const asset = ledger.balance(from);
  const liability = ledger.balance('issuer');
  if (
    typeof asset === 'bigint' &&
    typeof liability === 'bigint' &&
    asset >= amount &&
    liability >= amount
  ) {
    ledger.redeem('issuer', from, amount);
  }
}

function applyBitcoinOp(ledger: Ledger, op: BitcoinOp): void {
  const from = String(op.from);
  const to = String(op.to);
  if (op.kind === 'issue') {
    ledger.issue('issuer', from, op.amount);
    return;
  }
  if (op.kind === 'transfer') {
    if (from === to) {
      return;
    }
    const balance = ledger.balance(from);
    if (typeof balance === 'number' && balance >= op.amount) {
      ledger.transfer(from, to, op.amount);
    }
    return;
  }
  const asset = ledger.balance(from);
  const liability = ledger.balance('issuer');
  if (
    typeof asset === 'number' &&
    typeof liability === 'number' &&
    asset >= op.amount &&
    liability >= op.amount
  ) {
    ledger.redeem('issuer', from, op.amount);
  }
}
