import { describe, expect, it } from 'vitest';
import { Ledger } from '../ledger/ledger.js';
import { postBalancedStockLines } from './bookkeeping.js';

describe('stock journal', () => {
  it('rejects a one-line stock posting', () => {
    const ledger = new Ledger('cent');
    ledger.open('vault', 'asset');
    ledger.open('bank-equity', 'equity');
    expect(() =>
      postBalancedStockLines(ledger, [{ accountId: 'vault', side: 'debit', amount: 1n }]),
    ).toThrow(/at least two/);
  });
});
