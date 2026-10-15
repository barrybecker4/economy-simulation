/** Shared settings for the deficit lesson. The test and the page use this world. */

export const DEFICIT_LESSON_SEED = 1;
export const DEFICIT_LESSON_TICKS = 48;

const BALANCED_SPEND = 0.2;
const DEFICIT_SPEND = 0.35;

/**
 * A smaller closed fiat economy. The grant and the stabilizer are off, shocks
 * are off, and the inflation anchor sits on the target, so the only differences
 * a student can turn are the purchase share and the two levers.
 */
export function deficitLessonSliders(input: {
  addsDemand: boolean;
  pricesFollowDemand: boolean;
  deficit: boolean;
}): Record<string, number | string> {
  return {
    'regime.type': 'fiat',
    'scale.households': 80,
    'scale.firms': 8,
    'scale.banks': 1,
    'shock.frequency': 0,
    'government.ubiShare': 0,
    'government.stabilizer': 0,
    'expectations.anchorWeight': 0,
    'tax.incomeRate': BALANCED_SPEND,
    'government.spendingShareOfGDP': input.deficit ? DEFICIT_SPEND : BALANCED_SPEND,
    'government.spendingAddsDemand': input.addsDemand ? 'on' : 'off',
    'prices.trendWeight': input.pricesFollowDemand ? 0 : 1,
  };
}
