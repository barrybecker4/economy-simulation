import type { MoneyUnit } from '../money/amount.js';
import { Ledger } from './ledger.js';
import type { AccountKind, AuditReport, PostingLine } from './types.js';

export interface MoneySpec {
  id: string;
  unit: MoneyUnit;
}

/**
 * One ledger per money. Each book audits on its own.
 * An exchange posts both sides, so neither money is created or destroyed.
 */
export class MultiLedger {
  private readonly books = new Map<string, Ledger>();

  constructor(monies: readonly MoneySpec[]) {
    if (monies.length === 0) {
      throw new Error('A multi-ledger needs at least one money');
    }
    for (const money of monies) {
      if (this.books.has(money.id)) {
        throw new Error(`Duplicate money ${money.id}`);
      }
      this.books.set(money.id, new Ledger(money.unit));
    }
  }

  ledger(id: string): Ledger {
    const book = this.books.get(id);
    if (!book) {
      throw new Error(`Unknown money ${id}`);
    }
    return book;
  }

  open(moneyId: string, accountId: string, kind: AccountKind): void {
    this.ledger(moneyId).open(accountId, kind);
  }

  post(moneyId: string, lines: readonly PostingLine[]): void {
    this.ledger(moneyId).post(lines);
  }

  /**
   * The payer gives `fromAmount` of `fromMoney` to the dealer and receives
   * `toAmount` of `toMoney`. The rate is the pair of amounts.
   */
  exchange(input: {
    fromMoney: string;
    toMoney: string;
    payer: string;
    dealer: string;
    fromAmount: bigint | number;
    toAmount: bigint | number;
  }): void {
    this.ledger(input.fromMoney).transfer(input.payer, input.dealer, input.fromAmount);
    this.ledger(input.toMoney).transfer(input.dealer, input.payer, input.toAmount);
  }

  audit(): { ok: boolean; reports: AuditReport[] } {
    const reports = [...this.books.values()].map((book) => book.audit());
    return { ok: reports.every((report) => report.ok), reports };
  }
}
