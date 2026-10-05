import type { MoneyUnit } from '../money/amount.js';

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
