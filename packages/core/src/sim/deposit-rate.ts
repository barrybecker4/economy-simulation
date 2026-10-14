import type { Economy } from './economy.js';
import type { Parameters } from './parameters.js';

/**
 * `bank.fiatDepositPassThrough` at this value means fiat uses
 * `bank.depositPassThrough`, the same slider as bitcoin and hybrid.
 */
export const FIAT_DEPOSIT_PASS_THROUGH_INHERIT = -1;

/**
 * Pass-through that posts the deposit rate. Fiat uses
 * `bank.fiatDepositPassThrough` when that slider is at least 0. Otherwise,
 * and always under bitcoin and hybrid, the rate is `bank.depositPassThrough`.
 * The monetary preset sets the fiat slider to 0.45 and leaves the shared
 * slider at 1, so only fiat on that preset moves off master's pass-through.
 */
export function effectiveDepositPassThrough(
  params: Pick<Parameters, 'regime' | 'depositPassThrough' | 'fiatDepositPassThrough'>,
): number {
  if (params.regime === 'fiat' && params.fiatDepositPassThrough >= 0) {
    return params.fiatDepositPassThrough;
  }
  return params.depositPassThrough;
}

/** Publish `depositRate` from the effective pass-through and the policy rate. */
export function assignPostedDepositRate(economy: Economy): void {
  economy.depositRate = effectiveDepositPassThrough(economy.params) * economy.policyRate;
}
