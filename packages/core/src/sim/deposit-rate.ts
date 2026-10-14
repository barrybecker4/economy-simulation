import type { Economy } from './economy.js';
import type { Parameters } from './parameters.js';

/**
 * `bank.fiatDepositPassThrough` at this value means fiat deposits use
 * `bank.depositPassThrough`. Hybrid fiat deposits follow that same rule.
 * The bitcoin regime always uses the shared slider.
 */
export const FIAT_DEPOSIT_PASS_THROUGH_INHERIT = -1;

/**
 * Pass-through that posts the deposit rate. Fiat, and fiat deposits under
 * hybrid, use `bank.fiatDepositPassThrough` when that slider is at least 0.
 * Otherwise they use `bank.depositPassThrough`. The bitcoin regime always
 * uses the shared slider. Hybrid coin deposits are not paid this rate, so
 * under hybrid it is only the fiat deposit coupon. The monetary preset sets
 * the fiat slider to 0.45 and leaves the shared slider at 1, so fiat deposits
 * on that preset, including hybrid, take the deposit beta and the bitcoin
 * regime stays on the previous pass-through.
 */
export function effectiveDepositPassThrough(
  params: Pick<Parameters, 'regime' | 'depositPassThrough' | 'fiatDepositPassThrough'>,
): number {
  if (
    (params.regime === 'fiat' || params.regime === 'hybrid') &&
    params.fiatDepositPassThrough >= 0
  ) {
    return params.fiatDepositPassThrough;
  }
  return params.depositPassThrough;
}

/** Publish `depositRate` from the effective pass-through and the policy rate. */
export function assignPostedDepositRate(economy: Economy): void {
  economy.depositRate = effectiveDepositPassThrough(economy.params) * economy.policyRate;
}
