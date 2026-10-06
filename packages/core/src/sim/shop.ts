import { creditDeposit } from './money.js';
import type { Firm } from './types.js';

export interface ShopResult {
  spent: number;
  bought: number;
}

/**
 * Walk `sampleSize` firms from `start` and buy while budget remains.
 * Credits the seller's deposit, reduces inventory, and records the sale.
 */
export function buyFromFirms(
  firms: readonly Firm[],
  budget: number,
  start: number,
  sampleSize: number,
): ShopResult {
  let left = budget;
  let spent = 0;
  let bought = 0;
  if (left <= 0 || firms.length === 0) {
    return { spent, bought };
  }
  for (let attempt = 0; attempt < sampleSize && left > 0; attempt += 1) {
    const seller = firms[(start + attempt) % firms.length];
    if (!seller || seller.inventory <= 0 || seller.price <= 0) {
      continue;
    }
    const units = Math.min(seller.inventory, left / seller.price);
    const bill = Math.min(left, Math.round(units * seller.price));
    if (bill <= 0) {
      continue;
    }
    const taken = bill / seller.price;
    creditDeposit(seller, bill);
    seller.inventory -= taken;
    seller.salesUnits += taken;
    left -= bill;
    spent += bill;
    bought += taken;
  }
  return { spent, bought };
}
