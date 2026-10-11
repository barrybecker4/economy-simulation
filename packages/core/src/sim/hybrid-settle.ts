/**
 * Hybrid settlement helpers. Amounts are ledger cents of value; bitcoin
 * quantities are amount / bitcoinPrice.
 */

import { creditBitcoin, debitBitcoin } from './dual-currency.js';
import type { Economy } from './economy.js';
import { amountWithin, moneyAmount } from './helpers.js';
import { fundFiatFromCoins, payCurrencyOf, swapAtResidual } from './hybrid-money.js';
import type { DepositAccount } from './deposit-account.js';
import type { PayCurrency } from './types.js';

type CashAccount = DepositAccount & { bitcoin: number; payCurrency?: PayCurrency };

/** Credit `amount` cents of value in `currency`. */
export function creditCurrency(
  economy: Economy,
  account: CashAccount,
  amount: number,
  currency: PayCurrency,
): void {
  const take = moneyAmount(economy, amount);
  if (!(take > 0)) {
    return;
  }
  if (currency === 'fiat' || economy.params.regime !== 'hybrid') {
    account.deposit += take;
    return;
  }
  const price = economy.bitcoinPrice;
  if (!(price > 0)) {
    account.deposit += take;
    return;
  }
  creditBitcoin(economy, account, take / price);
}

/**
 * Debit up to `amount` cents of value in `currency`, swapping at the residual
 * if needed. Returns the value actually taken. A short till does not invent
 * the rest.
 */
export function debitCurrency(
  economy: Economy,
  account: CashAccount,
  amount: number,
  currency: PayCurrency,
): number {
  const take = moneyAmount(economy, amount);
  if (!(take > 0)) {
    return 0;
  }
  if (currency === 'fiat' || economy.params.regime !== 'hybrid') {
    return debitFiat(economy, account, take);
  }
  const price = economy.bitcoinPrice;
  if (!(price > 0)) {
    return debitFiat(economy, account, take);
  }
  const have = Math.max(0, account.bitcoin) * price;
  if (have + 1e-9 < take) {
    swapAtResidual(economy, account, take - have);
  }
  const value = amountWithin(economy, Math.min(take, Math.max(0, account.bitcoin) * price));
  if (!(value > 0)) {
    return 0;
  }
  debitBitcoin(economy, account, value / price);
  return value;
}

function debitFiat(economy: Economy, account: CashAccount, take: number): number {
  fundFiatFromCoins(economy, account, take);
  const paid = Math.min(take, Math.max(0, account.deposit));
  if (paid > 0) {
    account.deposit -= paid;
  }
  return paid;
}

/** Move value from payer to payee in the given currency. */
/** Move value from payer to payee. The payee receives only what the payer actually gave up. */
export function transferCurrency(
  economy: Economy,
  from: CashAccount,
  to: CashAccount,
  amount: number,
  currency: PayCurrency,
): number {
  const paid = debitCurrency(economy, from, amount, currency);
  if (!(paid > 0)) {
    return 0;
  }
  creditCurrency(economy, to, paid, currency);
  return paid;
}

export function currencyFor(actor: { payCurrency?: PayCurrency }): PayCurrency {
  return payCurrencyOf(actor);
}
