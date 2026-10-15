/** A gap inside this fraction of the level counts as the same path. */
export const LESSON_RELATIVE_BAND = 0.02;

/** "10.1 percent lower", or "about the same" inside the band. */
export function comparePhrase(baseline: number, scenario: number): string {
  if (!(baseline > 0) || !Number.isFinite(scenario)) {
    return 'about the same';
  }
  const ratio = scenario / baseline;
  if (Math.abs(ratio - 1) <= LESSON_RELATIVE_BAND) {
    return 'about the same';
  }
  const pct = Math.round(Math.abs(ratio - 1) * 1000) / 10;
  const shown = pct >= 10 ? String(Math.round(pct)) : pct.toFixed(1);
  const direction = ratio > 1 ? 'higher' : 'lower';
  return `${shown} percent ${direction}`;
}

export function addSeries(left: readonly number[], right: readonly number[]): number[] {
  const length = Math.min(left.length, right.length);
  const sums: number[] = [];
  for (let index = 0; index < length; index += 1) {
    sums.push((left[index] ?? 0) + (right[index] ?? 0));
  }
  return sums;
}

export interface LessonLevels {
  priceBaseline: number;
  priceScenario: number;
  /** Average household goods spending. */
  demandBaseline: number;
  demandScenario: number;
  moneyBaseline: number;
  moneyScenario: number;
}

export interface LessonCopy {
  score: string;
  prices: string;
  demand: string;
  money: string;
}

/** Sentences for the measured gaps. Directions come from the run, not from a script. */
export function lessonCopy(input: {
  addsDemand: boolean;
  pricesFollowDemand: boolean;
  levels: LessonLevels;
}): LessonCopy {
  const prices = comparePhrase(input.levels.priceBaseline, input.levels.priceScenario);
  const demand = comparePhrase(input.levels.demandBaseline, input.levels.demandScenario);
  const money = comparePhrase(input.levels.moneyBaseline, input.levels.moneyScenario);
  return {
    score: `Prices end ${prices}. Household goods average ${demand}. The money stock ends ${money}.`,
    prices: input.pricesFollowDemand
      ? `Prices end ${prices}. Posted prices follow excess demand: how much buyers want relative to what firms can make this month.`
      : `Prices end ${prices}. Posted prices follow the 2 percent inflation target. The money stock is not in that rule.`,
    demand: input.addsDemand
      ? `Household goods average ${demand}. Households give up only the tax, and they spend the gap between the 35 percent purchase share and the 20 percent tax. Less is left on the shelf, so the treasury buys less.`
      : `Household goods average ${demand}. The 35 percent purchase share is taken out of household budgets. The treasury buys more of the inventory they leave.`,
    money: `The money stock ends ${money}. The treasury issues bonds for the purchase order the tax does not cover, and those bonds create deposits.`,
  };
}
