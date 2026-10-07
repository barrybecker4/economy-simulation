import { splitEqual } from './allocate.js';
import { issueBonds } from './bank-books.js';
import { savingsRoom } from './banking.js';
import type { Economy } from './economy.js';
import { moneyAmount, unemploymentGap } from './helpers.js';
import { distributeIncome, redistributeToUnemployed } from './income.js';
import {
  creditDeposit,
  creditTreasury,
  debitDeposit,
  debitTreasury,
  payFromTreasury,
  transferDeposit,
  type DepositAccount,
} from './money.js';
import { AI_RETAINED_WAGE_SHARE, INCOME_SMOOTHING, MAX_SPEND_SHARE } from './rules.js';
import { clamp } from './stats.js';
import type { Firm } from './types.js';

/**
 * Tax uses the income carried into the tick. Purchases land in firm deposits
 * before wages are paid from those receipts. The household grant counts in
 * income after wages.
 */
export function onGovernment(economy: Economy): void {
  collectTax(economy);
  const grants = payUbi(economy);
  buyGoods(economy);
  distributeIncome(economy);
  redistributeToUnemployed(economy);
  addGrants(economy, grants);
  sweepAgents(economy);
  smoothIncomes(economy);
  if (economy.govDeposits < 0) {
    issueBonds(economy, -economy.govDeposits);
  }
  economy.fiscalBoost = fiscalBoost(economy);
}

function collectTax(economy: Economy): void {
  let tax = 0;
  let agentTax = 0;
  for (const household of economy.households) {
    const paid = payTax(household, Math.round(economy.params.taxRate * household.income));
    tax += paid;
  }
  for (const agent of economy.agents) {
    const bill = moneyAmount(economy, economy.params.taxRate * agent.income);
    const paid = payTax(agent, bill);
    tax += paid;
    agentTax += paid;
  }
  creditTreasury(economy, tax);
  economy.taxRevenue = tax;
  economy.agentTaxRevenue = agentTax;
}

function payTax(account: DepositAccount, bill: number): number {
  const paid = Math.min(account.deposit, bill);
  debitDeposit(account, paid);
  return paid;
}

function payUbi(economy: Economy): number[] {
  const grants = new Array<number>(economy.households.length).fill(0);
  economy.ubiOutlay = 0;
  const grantPool = ubiPool(economy);
  if (grantPool <= 0 || economy.households.length === 0) {
    return grants;
  }
  fundShortfall(economy, grantPool);
  const parts = splitEqual(grantPool, economy.households.length);
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    const share = parts[index] ?? 0;
    if (!household) {
      continue;
    }
    grants[index] = share;
    creditDeposit(household, share);
    economy.ubiOutlay += share;
  }
  debitTreasury(economy, economy.ubiOutlay);
  return grants;
}

function ubiPool(economy: Economy): number {
  const aiShare = economy.aiFactor > 1 ? 1 - 1 / economy.aiFactor : 0;
  const nominalGdp = economy.priceLevel * economy.realGdp;
  return Math.max(0, Math.round(economy.params.ubiShare * aiShare * nominalGdp));
}

function buyGoods(economy: Economy): void {
  let purchases = Math.max(0, Math.round(effectiveSpendShare(economy) * economy.demandBase));
  if (economy.params.regime !== 'fiat' && economy.params.stabilizer > 0) {
    const room = Math.max(0, economy.govDeposits) + Math.max(0, savingsRoom(economy));
    purchases = Math.min(purchases, Math.round(room));
  }
  fundShortfall(economy, purchases);
  economy.govGoodsSpend = purchases - spendOnInventory(economy, purchases);
}

function spendOnInventory(economy: Economy, purchases: number): number {
  let remaining = purchases;
  const byStock = [...economy.firms].sort((left, right) => right.inventory - left.inventory);
  for (const firm of byStock) {
    remaining = buyFirmInventory(economy, firm, remaining);
  }
  return remaining;
}

function buyFirmInventory(economy: Economy, firm: Firm, remaining: number): number {
  if (remaining <= 0 || firm.inventory <= 0 || firm.price <= 0) {
    return remaining;
  }
  const units = Math.min(firm.inventory, remaining / firm.price);
  const bill = Math.min(remaining, Math.round(units * firm.price));
  if (bill <= 0) {
    return remaining;
  }
  payFromTreasury(firm, economy, bill);
  const taken = bill / firm.price;
  firm.inventory -= taken;
  firm.sales += taken;
  return remaining - bill;
}

function effectiveSpendShare(economy: Economy): number {
  if (economy.params.stabilizer <= 0 || economy.params.regime !== 'fiat') {
    return economy.params.spendShare;
  }
  const boosted = economy.params.spendShare + economy.params.stabilizer * unemploymentGap(economy);
  return clamp(boosted, 0, MAX_SPEND_SHARE);
}

function addGrants(economy: Economy, grants: readonly number[]): void {
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    const grant = grants[index] ?? 0;
    if (household && grant > 0) {
      household.income += grant;
    }
  }
}

function smoothIncomes(economy: Economy): void {
  for (const household of economy.households) {
    household.smoothed = Math.round(smoothToward(household.smoothed, household.income));
  }
  for (const agent of economy.agents) {
    agent.smoothed = smoothToward(agent.smoothed, agent.income);
  }
}

function smoothToward(previous: number, current: number): number {
  return INCOME_SMOOTHING * previous + (1 - INCOME_SMOOTHING) * current;
}

function fundShortfall(economy: Economy, amount: number): void {
  const shortfall = amount - Math.max(0, economy.govDeposits);
  if (shortfall > 0) {
    issueBonds(economy, shortfall);
  }
}

function fiscalBoost(economy: Economy): number {
  if (economy.params.regime !== 'fiat' || economy.params.stabilizer <= 0) {
    return 0;
  }
  return economy.params.stabilizer * unemploymentGap(economy);
}

function sweepAgents(economy: Economy): void {
  economy.agentSweep = 0;
  const retain = economy.wageLevel * AI_RETAINED_WAGE_SHARE;
  for (const agent of economy.agents) {
    const sweep = agent.deposit - retain;
    if (sweep <= 0) {
      continue;
    }
    const owner = economy.households[agent.owner];
    if (!owner) {
      continue;
    }
    transferDeposit(agent, owner, sweep);
    economy.agentSweep += sweep;
  }
}
