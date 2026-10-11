/**
 * Hybrid dual-currency holdings at an exogenous BTC/USD path.
 * Fiat deposits are cents. Bitcoin units clear at supplyShockPriceCents.
 */

import { BITCOIN_OPENING_SHARE } from './bitcoin-supply.js';
import {
  bitcoinDepositUnits,
  bitcoinLoanUnits,
  creditBitcoin,
  debitBitcoin,
} from './dual-currency.js';
import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { moneyScores, nextMoneyShares } from './monies.js';
import { supplyShockPriceCents } from './supply-shock-price.js';
import type { DepositAccount } from './money.js';
import type { Agent, Firm, Household } from './types.js';

export type PayCurrency = 'fiat' | 'bitcoin';

/** Opening bitcoin share of cash. Stablecoin and CBDC stay in the fiat till. */
export function hybridOpeningBitcoinShare(): number {
  return BITCOIN_OPENING_SHARE;
}

/** Split opening cash, set the exogenous price, and endow the exchange residual. */
export function seedHybridCash(economy: Economy): void {
  if (economy.params.regime !== 'hybrid') {
    return;
  }
  economy.bitcoinPrice = supplyShockPriceCents(0) / Math.max(economy.nominalScale, 1);
  const share = hybridOpeningBitcoinShare();
  const price = economy.bitcoinPrice;
  if (!(price > 0) || share <= 0) {
    economy.exchangeBitcoin = 0;
    syncHybridCustody(economy);
    syncHybridMoneyShares(economy);
    return;
  }
  for (const household of economy.households) {
    splitOpeningCash(economy, household, share, price);
  }
  for (const firm of economy.firms) {
    splitOpeningCash(economy, firm, share, price);
  }
  for (const agent of economy.agents) {
    splitOpeningCash(economy, agent, share, price);
  }
  if (economy.govDeposits > 0) {
    const slice = moneyAmount(economy, economy.govDeposits * share);
    economy.govDeposits -= slice;
    creditBitcoin(economy, govAccount(economy), slice / price);
  }
  const held = bitcoinDepositUnits(economy);
  // Outside inventory: enough to buy the rest of cash into coin twice over.
  const fiat = fiatDepositStock(economy);
  economy.exchangeBitcoin = Math.max(held * 2, (fiat / price) * 2);
  assignPayCurrencies(economy);
  syncHybridCustody(economy);
  syncHybridMoneyShares(economy);
}

/** Apply the exogenous price, optional choice swaps, custody mark, and chart shares. */
export function updateHybridMoney(economy: Economy): void {
  if (economy.params.regime !== 'hybrid') {
    return;
  }
  economy.bitcoinPrice = supplyShockPriceCents(economy.tick) / Math.max(economy.nominalScale, 1);
  if (economy.params.choiceSpeed > 0) {
    rebalanceTowardScores(economy);
  }
  assignPayCurrencies(economy);
  syncHybridCustody(economy);
  syncHybridMoneyShares(economy);
}

/**
 * Custody asset equals net coin liabilities at the current price so a price
 * move does not hit bank equity.
 */
export function syncHybridCustody(economy: Economy): void {
  const price = economy.bitcoinPrice;
  const deposits = bitcoinDepositUnits(economy) * price;
  const loans = bitcoinLoanUnits(economy) * price;
  economy.bitcoinReserves = deposits - loans;
  economy.bitcoinCarried = deposits;
  economy.bitcoinLoanCarried = loans;
}

/** Chart shares are marked fiat and bitcoin values. Stablecoin and CBDC stay at 0. */
export function syncHybridMoneyShares(economy: Economy): void {
  const fiat = Math.max(0, fiatDepositStock(economy));
  const bitcoin = Math.max(0, bitcoinDepositUnits(economy) * economy.bitcoinPrice);
  const total = fiat + bitcoin;
  if (!(total > 0)) {
    economy.moneyShares = { fiat: 1, bitcoin: 0, stablecoin: 0, cbdc: 0 };
    return;
  }
  economy.moneyShares = {
    fiat: fiat / total,
    bitcoin: bitcoin / total,
    stablecoin: 0,
    cbdc: 0,
  };
}

/**
 * Sell bitcoin into fiat at the residual until `account.deposit` covers `amount`,
 * or the coin till is empty. Used before fiat-only payouts so custody stays closed.
 */
export function fundFiatFromCoins(
  economy: Economy,
  account: DepositAccount & { bitcoin: number },
  amount: number,
): void {
  const short = amount - Math.max(0, account.deposit);
  if (!(short > 0)) {
    return;
  }
  swapAtResidual(economy, account, -short);
}

/**
 * Move `value` of fiat into bitcoin units at the posted price, or the reverse
 * when negative. Fiat that leaves or enters a deposit is matched by bank
 * reserves so custody and the reserve stock stay on the identity.
 */
export function swapAtResidual(
  economy: Economy,
  account: DepositAccount & { bitcoin: number },
  value: number,
): void {
  const price = economy.bitcoinPrice;
  if (!(price > 0) || value === 0) {
    return;
  }
  const bank = economy.banks[0];
  if (!bank) {
    return;
  }
  if (value > 0) {
    const afford = Math.min(
      value,
      Math.max(0, account.deposit),
      economy.exchangeBitcoin * price,
      Math.max(0, bank.reserves),
    );
    const take = moneyAmount(economy, afford);
    if (!(take > 0)) {
      return;
    }
    const units = take / price;
    account.deposit -= take;
    bank.reserves -= take;
    creditBitcoin(economy, account, units);
    economy.exchangeBitcoin -= units;
    return;
  }
  const sellValue = Math.min(-value, account.bitcoin * price);
  const take = moneyAmount(economy, sellValue);
  if (!(take > 0)) {
    return;
  }
  const units = take / price;
  debitBitcoin(economy, account, units);
  account.deposit += take;
  bank.reserves += take;
  economy.exchangeBitcoin += units;
}

export function payCurrencyOf(actor: { payCurrency?: PayCurrency }): PayCurrency {
  return actor.payCurrency === 'bitcoin' ? 'bitcoin' : 'fiat';
}

function splitOpeningCash(
  economy: Economy,
  account: DepositAccount & { bitcoin: number },
  share: number,
  price: number,
): void {
  const slice = moneyAmount(economy, Math.max(0, account.deposit) * share);
  if (!(slice > 0)) {
    return;
  }
  account.deposit -= slice;
  creditBitcoin(economy, account, slice / price);
}

function rebalanceTowardScores(economy: Economy): void {
  const realReturn = economy.depositRate - economy.moneyShares.bitcoin * economy.params.prodGrowth;
  const scores = moneyScores({
    fiatLegal: economy.params.fiatLegalTender,
    bitcoinTrust: economy.params.bitcoinTrust,
    realReturn,
  });
  const target = nextMoneyShares(economy.moneyShares, scores, 1);
  const speed = economy.params.choiceSpeed;
  for (const household of economy.households) {
    rebalanceAccount(economy, household, target.bitcoin, speed);
  }
  for (const firm of economy.firms) {
    rebalanceAccount(economy, firm, target.bitcoin, speed);
  }
  for (const agent of economy.agents) {
    rebalanceAccount(economy, agent, target.bitcoin, speed);
  }
  rebalanceTreasury(economy, target.bitcoin, speed);
}

function rebalanceAccount(
  economy: Economy,
  account: DepositAccount & { bitcoin: number },
  targetShare: number,
  speed: number,
): void {
  const price = economy.bitcoinPrice;
  const cash = Math.max(0, account.deposit) + Math.max(0, account.bitcoin) * price;
  if (!(cash > 0) || !(price > 0)) {
    return;
  }
  const desired = cash * targetShare;
  const current = account.bitcoin * price;
  swapAtResidual(economy, account, (desired - current) * speed);
}

function rebalanceTreasury(economy: Economy, targetShare: number, speed: number): void {
  const price = economy.bitcoinPrice;
  const cash = Math.max(0, economy.govDeposits) + Math.max(0, economy.govBitcoin) * price;
  if (!(cash > 0) || !(price > 0)) {
    return;
  }
  const desired = cash * targetShare;
  const current = economy.govBitcoin * price;
  swapAtResidual(economy, govAccount(economy), (desired - current) * speed);
}

function assignPayCurrencies(economy: Economy): void {
  const realReturn = economy.depositRate - economy.moneyShares.bitcoin * economy.params.prodGrowth;
  const scores = moneyScores({
    fiatLegal: economy.params.fiatLegalTender,
    bitcoinTrust: economy.params.bitcoinTrust,
    realReturn,
  });
  const preferBitcoin = scores[1] > scores[0];
  const currency: PayCurrency = preferBitcoin ? 'bitcoin' : 'fiat';
  for (const household of economy.households) {
    household.payCurrency = currency;
  }
  for (const firm of economy.firms) {
    firm.payCurrency = currency;
  }
}

function fiatDepositStock(economy: Economy): number {
  let total = economy.govDeposits;
  for (const household of economy.households) {
    total += household.deposit;
  }
  for (const firm of economy.firms) {
    total += firm.deposit;
  }
  for (const agent of economy.agents) {
    total += agent.deposit;
  }
  return total;
}

function govAccount(economy: Economy): { deposit: number; bitcoin: number } {
  return {
    get deposit() {
      return economy.govDeposits;
    },
    set deposit(value: number) {
      economy.govDeposits = value;
    },
    get bitcoin() {
      return economy.govBitcoin;
    },
    set bitcoin(value: number) {
      economy.govBitcoin = value;
    },
  };
}

export type HybridCashHolder = Household | Firm | Agent;
