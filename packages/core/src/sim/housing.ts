import { monthlyFromAnnual, clamp } from './stats.js';
import type { Economy } from './economy.js';

const NEUTRAL_DEMAND = 0.55;
const PRESSURE_SPEED = 0.08;

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
