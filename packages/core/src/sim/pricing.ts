import {
  EXCESS_DEMAND_CAP,
  INVENTORY_MONTHS,
  INVENTORY_PRESSURE_BAND,
  MAX_MONTHLY_PRICE_MOVE,
  MAX_PRICE_PULL,
  PRICE_PULL_SCALE,
  SHOCK_PRICE_WEIGHT,
} from './rules.js';
import { clamp } from './stats.js';

export function inventoryPressure(capacity: number, inventory: number): number {
  const pressure = (INVENTORY_MONTHS * Math.max(capacity, 1)) / Math.max(inventory, 0.25);
  return clamp(pressure, 1 - INVENTORY_PRESSURE_BAND, 1 + INVENTORY_PRESSURE_BAND);
}

/** Monthly proportional price change from trend, demand, cost, and the active shock. */
export function monthlyPriceMove(input: {
  price: number;
  unitCost: number;
  markup: number;
  pressure: number;
  priceSpeed: number;
  trend: number;
  excessDemand: number;
  trendWeight: number;
  demandImpulse: number;
  productivityImpulse: number;
}): number {
  const costTarget = input.unitCost * (1 + input.markup) * input.pressure;
  const nudge = clamp(
    input.priceSpeed * PRICE_PULL_SCALE * (costTarget / Math.max(input.price, 1) - 1),
    -MAX_PRICE_PULL,
    MAX_PRICE_PULL,
  );
  const shockTilt =
    SHOCK_PRICE_WEIGHT * input.demandImpulse - SHOCK_PRICE_WEIGHT * input.productivityImpulse;
  const demandMove =
    input.trendWeight * input.trend +
    (1 - input.trendWeight) * clamp(input.excessDemand, -EXCESS_DEMAND_CAP, EXCESS_DEMAND_CAP);
  return clamp(demandMove + nudge + shockTilt, -MAX_MONTHLY_PRICE_MOVE, MAX_MONTHLY_PRICE_MOVE);
}
