import type { MoneyUnit } from '../money/amount.js';

/** Maps the regime slider onto a ledger unit. Regime behavior arrives in a later phase. */
export function unitForRegime(regime: string): MoneyUnit {
  if (regime === 'fiat') {
    return 'cent';
  }
  if (regime === 'bitcoin' || regime === 'hybrid') {
    return 'satoshi';
  }
  throw new Error(`Unknown regime.type ${regime}`);
}
