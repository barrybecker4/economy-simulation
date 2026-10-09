import { HOME_PRICE_MONTHS } from './rules.js';
import { monthlyFromAnnual, clamp } from './stats.js';
import type { Economy } from './economy.js';
import { normalInflation } from './helpers.js';

const NEUTRAL_DEMAND = 0.55;
const PRESSURE_SPEED = 0.08;

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

/** Home price in months of income after scarcity and the monetary premium. */
export function homePriceMonthsOf(input: {
  scarcity: number;
  monetaryPremium: number;
  normalInflation: number;
  inflationTarget: number;
}): number {
  return HOME_PRICE_MONTHS * input.scarcity * housingPriceMultiple(input);
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
  return {
    scarcity,
    multiple,
    months: HOME_PRICE_MONTHS * scarcity * multiple,
  };
}

/** Next housing scarcity index. Neutral demand and zero supply growth leave it unchanged. */
export function nextHousingPressure(input: {
  pressure: number;
  demand: number;
  supplyGrowthMonthly: number;
}): number {
  const gap = clamp(input.demand - NEUTRAL_DEMAND, -0.5, 0.5);
  const updated = (input.pressure * (1 + PRESSURE_SPEED * gap)) / (1 + input.supplyGrowthMonthly);
  return clamp(updated, 0.25, 4);
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
