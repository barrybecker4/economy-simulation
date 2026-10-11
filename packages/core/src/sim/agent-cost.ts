import { exp } from '../math/elementary.js';

/** Real unit cost in opening money units, before the price-level scale. */
export function realUnitCost(input: {
  tick: number;
  openingWage: number;
  initialCostShare: number;
  costHalvingMonths: number;
  energyStepMonth: number;
  energyStepSize: number;
}): number {
  const halving = Math.max(input.costHalvingMonths, 1e-9);
  const decay = 0.5 ** (input.tick / halving);
  const stepped =
    input.energyStepSize > 0 && input.tick >= input.energyStepMonth ? 1 - input.energyStepSize : 1;
  return input.initialCostShare * input.openingWage * decay * stepped;
}

/** Nominal ask for one compute unit. Depth 0 is cost marked up by friction only. */
export function quotedServicePrice(input: {
  realUnitCost: number;
  priceLevel: number;
  openingPriceLevel: number;
  friction: number;
  depth: number;
  agents: number;
  firms: number;
}): number {
  const opening = input.openingPriceLevel > 0 ? input.openingPriceLevel : 1;
  const base = input.realUnitCost * (input.priceLevel / opening) * (1 + input.friction);
  if (input.depth <= 0 || input.firms <= 0) {
    return base;
  }
  return base * (1 + input.depth * (input.agents / input.firms));
}

/** Share of one agent's compute a firm buys this month. Always in (0, 1]. */
export function agentTakeup(input: {
  ask: number;
  wage: number;
  valueWageShare: number;
  demandElasticity: number;
}): number {
  if (!(input.wage > 0) || !(input.valueWageShare > 0)) {
    return 0;
  }
  const relative = input.ask / input.wage / input.valueWageShare;
  return 1 / (1 + relative ** input.demandElasticity);
}

/** Slope of compute productivity after capability growth. */
export function computeProductivitySlope(
  base: number,
  capabilityGrowth: number,
  years: number,
): number {
  if (!(base > 0)) {
    return 0;
  }
  if (!(capabilityGrowth > 0) || !(years > 0)) {
    return base;
  }
  return base * 2 ** (capabilityGrowth * years);
}

/**
 * Capacity multiplier from compute bought last month.
 * Saturates at 1 + ceiling. Zero units, slope, or ceiling leave capacity unchanged.
 */
export function saturatingCapacityFactor(units: number, slope: number, ceiling: number): number {
  if (!(units > 0) || !(slope > 0) || !(ceiling > 0)) {
    return 1;
  }
  return 1 + ceiling * (1 - exp((-slope * units) / ceiling));
}
