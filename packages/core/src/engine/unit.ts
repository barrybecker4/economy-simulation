import type { MoneyUnit } from '../money/amount.js';

/** Maps the regime slider onto a ledger unit. */
export function unitForRegime(regime: string): MoneyUnit {
  if (regime === 'fiat' || regime === 'hybrid') {
    // Hybrid clears goods in cents with a separate bitcoin till.
    return 'cent';
  }
  if (regime === 'bitcoin') {
    return 'satoshi';
  }
  throw new Error(`Unknown regime.type ${regime}`);
}
