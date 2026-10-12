import { HOME_PRICE_MONTHS, MONTHS_PER_YEAR } from './rules.js';
import { monthlyFromAnnual, clamp } from './stats.js';
import type { Economy } from './economy.js';
import { normalInflation } from './helpers.js';

const NEUTRAL_DEMAND = 0.55;
const PRESSURE_SPEED = 0.08;
/** Soft ceiling: positive demand gap fades to zero as pressure approaches this. */
export const HOUSING_PRESSURE_SOFT = 8;
/** Hard floor / ceiling on the scarcity index. */
export const HOUSING_PRESSURE_MIN = 0.25;
export const HOUSING_PRESSURE_MAX = 20;

/**
 * Share of the fiat-target home price that remains as an inflation hedge.
 * Zero when money itself holds purchasing power; one when the regime path
 * matches a positive inflation target.
 */
export function housingHedgeShare(normalInflationRate: number, inflationTarget: number): number {
  if (inflationTarget <= 0) {
    return 0;
  }
  return clamp(normalInflationRate / inflationTarget, 0, 1);
}

/**
 * Multiplier on the 48-month home price. At premium 0 the multiple is 1. Under
 * a deflationary regime path the premium share comes out of the price.
 */
export function housingPriceMultiple(input: {
  monetaryPremium: number;
  normalInflation: number;
  inflationTarget: number;
}): number {
  const hedge = housingHedgeShare(input.normalInflation, input.inflationTarget);
  return 1 - input.monetaryPremium * (1 - hedge);
}

/** Construction-tech factor on the months-of-income sticker: (1 + g_c)^(-years). */
export function constructionCostFactor(
  constructionProductivity: number,
  years: number,
): number {
  if (!(years > 0) || !(constructionProductivity > -1)) {
    return 1;
  }
  return (1 + constructionProductivity) ** -years;
}

/** Home price in months of income after scarcity, construction tech, and the monetary premium. */
export function homePriceMonthsOf(input: {
  scarcity: number;
  monetaryPremium: number;
  normalInflation: number;
  inflationTarget: number;
  constructionProductivity?: number;
  years?: number;
}): number {
  const build = constructionCostFactor(input.constructionProductivity ?? 0, input.years ?? 0);
  return HOME_PRICE_MONTHS * build * input.scarcity * housingPriceMultiple(input);
}

/** Scarcity and monetary-premium multiple for the current economy. */
export function housingPriceFactors(economy: Economy): {
  scarcity: number;
  multiple: number;
  months: number;
} {
  const scarcity = economy.params.marketClearing === 'on' ? economy.housingPressure : 1;
  const multiple = housingPriceMultiple({
    monetaryPremium: economy.params.monetaryPremium,
    normalInflation: normalInflation(economy),
    inflationTarget: economy.params.inflationTarget,
  });
  const years = economy.tick / MONTHS_PER_YEAR;
  const build = constructionCostFactor(economy.params.housingConstructionProductivity, years);
  return {
    scarcity,
    multiple,
    months: HOME_PRICE_MONTHS * build * scarcity * multiple,
  };
}

/**
 * Next housing scarcity index. Positive demand pressure fades as the index
 * approaches the soft ceiling; above that only supply can lower it. Hard clamp
 * is a numerical guard.
 */
export function nextHousingPressure(input: {
  pressure: number;
  demand: number;
  supplyGrowthMonthly: number;
}): number {
  let gap = clamp(input.demand - NEUTRAL_DEMAND, -0.5, 0.5);
  if (gap > 0) {
    gap *= Math.max(0, 1 - input.pressure / HOUSING_PRESSURE_SOFT);
  }
  const updated = (input.pressure * (1 + PRESSURE_SPEED * gap)) / (1 + input.supplyGrowthMonthly);
  return clamp(updated, HOUSING_PRESSURE_MIN, HOUSING_PRESSURE_MAX);
}

export function updateHousingPressure(economy: Economy): void {
  if (economy.params.marketClearing !== 'on') {
    return;
  }
  economy.housingPressure = nextHousingPressure({
    pressure: economy.housingPressure,
    demand: housingDemand(economy),
    supplyGrowthMonthly: monthlyFromAnnual(economy.params.housingSupplyGrowth),
  });
}

function housingDemand(economy: Economy): number {
  if (economy.params.tenureChoice !== 'on' || economy.households.length === 0) {
    return NEUTRAL_DEMAND;
  }
  let seeking = 0;
  for (const household of economy.households) {
    if (household.tenure === 'mortgage' || household.tenure === 'owned') {
      seeking += 1;
    }
  }
  return seeking / economy.households.length;
}
