import type { Economy } from './economy.js';
import { currencyFor, transferCurrency } from './hybrid-settle.js';
import { creditDeposit } from './money.js';
import type { Firm, Household, PayCurrency } from './types.js';

export interface ShopResult {
  spent: number;
  bought: number;
}

export interface ShopPayment {
  economy: Economy;
  currency: PayCurrency;
  buyer: { deposit: number; bitcoin: number };
}

/**
 * Walk `sampleSize` firms from `start` and buy while budget remains.
 * Credits the seller, reduces inventory, and records the sale.
 * When `payment` is set, the buyer pays the seller in that currency and the
 * sale stops at what the buyer can actually hand over.
 */
export function buyFromFirms(
  firms: readonly Firm[],
  budget: number,
  start: number,
  sampleSize: number,
  payment?: ShopPayment,
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
    const paid = payment
      ? transferCurrency(payment.economy, payment.buyer, seller, bill, payment.currency)
      : bill;
    if (!(paid > 0)) {
      continue;
    }
    if (!payment) {
      creditDeposit(seller, paid);
    }
    const taken = paid / seller.price;
    seller.inventory -= taken;
    seller.sales += taken;
    left -= paid;
    spent += paid;
    bought += taken;
  }
  return { spent, bought };
}

/** Buyer currency for a hybrid goods payment. */
export function shopCurrency(economy: Economy, buyer: Household): PayCurrency {
  if (economy.params.regime !== 'hybrid') {
    return 'fiat';
  }
  return currencyFor(buyer);
}
