import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MultiLedger } from './books.js';

describe('multi-ledger', () => {
  it('audits each money after an exchange', () => {
    const books = openPair();
    books.exchange({
      fromMoney: 'fiat',
      toMoney: 'bitcoin',
      payer: 'alice',
      dealer: 'dealer',
      fromAmount: 25n,
      toAmount: 2.5,
    });
    expect(books.ledger('fiat').balance('alice')).toBe(975n);
    expect(books.ledger('fiat').balance('dealer')).toBe(25n);
    expect(books.ledger('bitcoin').balance('alice')).toBe(2.5);
    expect(books.ledger('bitcoin').balance('dealer')).toBe(997.5);
    expect(books.audit().ok).toBe(true);
  });

  it('keeps a single money equivalent to one ledger', () => {
    const books = new MultiLedger([{ id: 'fiat', unit: 'cent' }]);
    books.open('fiat', 'issuer', 'liability');
    books.open('fiat', 'alice', 'asset');
    books.ledger('fiat').issue('issuer', 'alice', 40n);
    expect(books.audit().ok).toBe(true);
    expect(books.ledger('fiat').balance('alice')).toBe(40n);
  });

  it('preserves both audits across random exchanges', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 8 }),
        (cents) => {
          const books = openPair();
          for (const cent of cents) {
            const sat = cent / 10;
            books.exchange({
              fromMoney: 'fiat',
              toMoney: 'bitcoin',
              payer: 'alice',
              dealer: 'dealer',
              fromAmount: BigInt(cent),
              toAmount: sat,
            });
          }
          expect(books.audit().ok).toBe(true);
        },
      ),
    );
  });
});

function openPair(): MultiLedger {
  const books = new MultiLedger([
    { id: 'fiat', unit: 'cent' },
    { id: 'bitcoin', unit: 'satoshi' },
  ]);
  books.open('fiat', 'issuer', 'liability');
  books.open('fiat', 'alice', 'asset');
  books.open('fiat', 'dealer', 'asset');
  books.ledger('fiat').issue('issuer', 'alice', 1000n);
  books.open('bitcoin', 'issuer', 'liability');
  books.open('bitcoin', 'alice', 'asset');
  books.open('bitcoin', 'dealer', 'asset');
  books.ledger('bitcoin').issue('issuer', 'dealer', 1000);
  return books;
}
