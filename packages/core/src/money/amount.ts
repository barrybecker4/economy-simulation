/**
 * Largest fiat balance stored in the ledger.
 * One household, firm, or bank balance must stay inside `Number.MAX_SAFE_INTEGER`.
 * An aggregate account may hold the sum of those balances up to this limit.
 */
export const MAX_CENT = (1n << 63n) - 1n;

/** Add finite cent components. Each component must stay inside the safe integer range. */
export function exactCentSum(values: Iterable<number>): bigint {
  let total = 0n;
  let fraction = 0;
  for (const value of values) {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      throw new Error('Fiat amount exceeds the safe integer range');
    }
    const whole = Math.trunc(value);
    fraction += value - whole;
    total += BigInt(whole);
    if (fraction >= 1 || fraction <= -1) {
      const carry = Math.trunc(fraction);
      fraction -= carry;
      total += BigInt(carry);
    }
  }
  return total + BigInt(Math.round(fraction));
}

/**
 * Bitcoin audit tolerance relative to the largest balance.
 * Doubles cannot sum fractional satoshis exactly, so the audit allows this drift.
 */
export const BITCOIN_AUDIT_RELATIVE_EPSILON = 1e-8;

/** Bitcoin audit tolerance used when balances are near zero. */
export const BITCOIN_AUDIT_ABSOLUTE_EPSILON = 1e-9;

/** Digits used when hashing floating-point output. */
export const CANONICAL_NUMBER_DIGITS = 12;

export type MoneyUnit = 'cent' | 'satoshi';

export function assertPositiveCent(amount: bigint): void {
  if (typeof amount !== 'bigint') {
    throw new Error('Fiat amounts must be bigint cents');
  }
  if (amount <= 0n) {
    throw new Error('Amount must be positive');
  }
  if (amount > MAX_CENT) {
    throw new Error('Fiat amount exceeds the safe integer range');
  }
}

export function assertCentBalance(balance: bigint): void {
  if (balance > MAX_CENT) {
    throw new Error('Fiat balance exceeds the safe integer range');
  }
}

export function assertPositiveSatoshi(amount: number): void {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error('Bitcoin amounts must be finite numbers of satoshis');
  }
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
}

export function formatCanonicalNumber(value: number): string {
  if (Object.is(value, -0)) {
    return '0';
  }
  if (!Number.isFinite(value)) {
    throw new Error('Cannot format a non-finite number');
  }
  return value.toExponential(CANONICAL_NUMBER_DIGITS);
}

export function bitcoinAmountsMatch(left: number, right: number): boolean {
  const scale = Math.max(1, Math.abs(left), Math.abs(right));
  return Math.abs(left - right) <= 1e-12 * scale;
}

export function bitcoinImbalanceOk(assets: number, liabilities: number, equity: number): boolean {
  const imbalance = assets - liabilities - equity;
  const scale = Math.max(1, Math.abs(assets), Math.abs(liabilities), Math.abs(equity));
  const tolerance = Math.max(
    BITCOIN_AUDIT_ABSOLUTE_EPSILON,
    BITCOIN_AUDIT_RELATIVE_EPSILON * scale,
  );
  return Math.abs(imbalance) <= tolerance;
}
