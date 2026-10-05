import { BASKET_WEIGHTS } from './basket.js';
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
