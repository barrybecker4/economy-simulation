import type { Economy } from './economy.js';
import type { Bank } from './types.js';

/**
 * Seat a bank-equity move on the private-equity residual so
 * vault = equity + privateEquity still holds when vault is unchanged.
 * Positive delta is income (equity up, residual down). Negative is a loss.
 */
export function adjustBankEquity(
  bank: Bank | undefined,
  economy: Economy,
  delta: number,
): void {
  if (delta === 0) {
    return;
  }
  if (bank) {
    bank.equity += delta;
  }
  economy.privateEquity -= delta;
}
