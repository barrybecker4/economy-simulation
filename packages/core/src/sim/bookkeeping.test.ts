import { describe, expect, it } from 'vitest';
import { Ledger } from '../ledger/ledger.js';
import { postBalancedStockLines } from './stocks.js';

describe('stock journal', () => {
  it('drops a one-line stock posting instead of writing an unbalanced journal', () => {
    const ledger = new Ledger('cent');
    ledger.open('vault', 'asset');
    ledger.open('bank-equity', 'equity');
    expect(() =>
      postBalancedStockLines(ledger, [{ accountId: 'vault', side: 'debit', amount: 1n }]),
    ).not.toThrow();
    expect(ledger.balance('vault')).toBe(0n);
  });
});
