import { INVENTORY_MONTHS, MONTHLY_DEPRECIATION } from './rules.js';
import { clamp } from './stats.js';
import type { Economy } from './economy.js';
import { firmCapacity } from './capacity.js';

export function onProduction(economy: Economy): void {
  for (const firm of economy.firms) {
    const capacity = firmCapacity(economy, firm);
    const targetStock = capacity * INVENTORY_MONTHS;
    const rebuild = clamp(targetStock - firm.inventory, -capacity, capacity * 0.5);
    firm.output = capacity;
    firm.inventory += Math.max(0, capacity + rebuild);
    firm.capital *= 1 - MONTHLY_DEPRECIATION;
  }
}
