/**
 * Hybrid settlement helpers. Amounts are ledger cents of value; bitcoin
 * quantities are amount / bitcoinPrice.
 */

import { creditBitcoin, debitBitcoin } from './dual-currency.js';
import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { fundFiatFromCoins, payCurrencyOf, swapAtResidual } from './hybrid-money.js';
import { creditDeposit, debitDeposit } from './money.js';
import type { DepositAccount } from './money.js';
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
    creditDeposit(account, take);
    return;
  }
  const price = economy.bitcoinPrice;
  if (!(price > 0)) {
    creditDeposit(account, take);
    return;
  }
  creditBitcoin(economy, account, take / price);
}

/** Debit `amount` cents of value in `currency`, swapping at the residual if needed. */
export function debitCurrency(
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
    fundFiatFromCoins(economy, account, take);
    debitDeposit(account, take);
    return;
  }
  const price = economy.bitcoinPrice;
  if (!(price > 0)) {
    fundFiatFromCoins(economy, account, take);
    debitDeposit(account, take);
    return;
  }
  const have = account.bitcoin * price;
  if (have + 1e-9 < take) {
    swapAtResidual(economy, account, take - have);
  }
  debitBitcoin(economy, account, take / price);
}

/** Move value from payer to payee in the given currency. */
export function transferCurrency(
  economy: Economy,
  from: CashAccount,
  to: CashAccount,
  amount: number,
  currency: PayCurrency,
): void {
  debitCurrency(economy, from, amount, currency);
  creditCurrency(economy, to, amount, currency);
}

export function currencyFor(actor: { payCurrency?: PayCurrency }): PayCurrency {
  return payCurrencyOf(actor);
}
