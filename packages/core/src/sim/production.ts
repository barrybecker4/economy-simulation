import { INVENTORY_MONTHS, MONTHLY_DEPRECIATION } from './rules.js';
import { clamp } from './stats.js';
import type { Economy } from './economy.js';
import { firmCapacity } from './capacity.js';
import type { Firm } from './types.js';

/**
 * Goods to produce when sales, not capacity, set the target.
 * Desired output restocks one month of inventory and never exceeds capacity.
 * Measured output is the only addition to inventory.
 */
export function demandedOutput(input: {
  capacity: number;
  expectedSales: number;
  inventory: number;
}): number {
  if (input.capacity <= 0) {
    return 0;
  }
  const targetStock = input.capacity * INVENTORY_MONTHS;
  const wanted = input.expectedSales + (targetStock - input.inventory);
  return clamp(wanted, 0, input.capacity);
}

export function onProduction(economy: Economy): void {
  for (const firm of economy.firms) {
    produce(economy, firm);
  }
}

function produce(economy: Economy, firm: Firm): void {
  const capacity = firmCapacity(economy, firm);
  const weight = economy.params.demandWeight;
  if (weight <= 0) {
    firm.output = capacity;
  } else {
    const demanded = demandedOutput({
      capacity,
      expectedSales: firm.expectedSales,
      inventory: firm.inventory,
    });
    firm.output = (1 - weight) * capacity + weight * demanded;
  }
  firm.inventory += firm.output;
  firm.capital *= 1 - MONTHLY_DEPRECIATION;
  firm.computeReady = 0;
}
