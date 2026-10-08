import { BASKET_WEIGHTS } from './basket.js';
import { DEPOSIT_BUFFER_MONTHS, WEALTH_MPC } from './rules.js';
import { clamp } from './stats.js';

/** Food and housing share of the CPI basket. Goods spending does not fall below this. */
export function subsistenceShare(): number {
  return BASKET_WEIGHTS.food + BASKET_WEIGHTS.housing;
}

/**
 * Household goods spending share of smoothed income. Structural impatience is
 * time preference relative to the mean. Inflation above the regime's normal
 * path adds sensitivity times that gap; sensitivity 0 is the prior rule.
 */
export function goodsSpendingShare(input: {
  governmentShare: number;
  timePref: number;
  timePrefMean: number;
  inflationGap: number;
  inflationSensitivity: number;
}): number {
  return clamp(
    1 -
      input.governmentShare +
      input.timePref -
      input.timePrefMean +
      input.inflationSensitivity * input.inflationGap,
    0.35,
    0.95,
  );
}

/**
 * Apply real-return sensitivity only to the discretionary remainder above the
 * food and housing floor. Sensitivity 0 leaves the uncut budget unchanged.
 */
export function discretionaryAfterRealReturn(input: {
  uncutBudget: number;
  realReturn: number;
  sensitivity: number;
  floorShare: number;
}): number {
  const floor = input.uncutBudget * clamp(input.floorShare, 0, 1);
  if (input.sensitivity <= 0 || input.realReturn <= 0) {
    return input.uncutBudget;
  }
  const discretionary = Math.max(0, input.uncutBudget - floor);
  const cut = discretionary * Math.max(0, 1 - input.sensitivity * input.realReturn);
  return floor + cut;
}

/** Smoothed-income spending plus a spend out of deposits above the buffer. */
export function uncutGoodsBudget(input: {
  smoothed: number;
  income: number;
  deposit: number;
  spendingShare: number;
  demandFactor: number;
}): number {
  const buffer = input.income * DEPOSIT_BUFFER_MONTHS;
  const extra = Math.max(0, input.deposit - buffer) * WEALTH_MPC;
  return input.smoothed * input.spendingShare * input.demandFactor + extra;
}

/** Household budget rule, including the real-return cut above the food and housing floor. */
export function goodsBudget(input: {
  smoothed: number;
  income: number;
  deposit: number;
  spendingShare: number;
  demandFactor: number;
  realReturn: number;
  realReturnSensitivity: number;
  floorShare: number;
  durableShare?: number;
}): number {
  const afterReturn = discretionaryAfterRealReturn({
    uncutBudget: uncutGoodsBudget(input),
    realReturn: input.realReturn,
    sensitivity: input.realReturnSensitivity,
    floorShare: input.floorShare,
  });
  const durableShare = clamp(input.durableShare ?? 0, 0, 0.5);
  if (durableShare <= 0 || input.realReturn <= 0) {
    return afterReturn;
  }
  const floor = afterReturn * clamp(input.floorShare, 0, 1);
  const discretionary = Math.max(0, afterReturn - floor);
  const durables = discretionary * durableShare;
  const delayed = durables * Math.max(0, 1 - input.realReturn);
  return floor + (discretionary - durables) + delayed;
}
