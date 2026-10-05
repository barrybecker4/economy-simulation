import { splitEqual } from './allocate.js';
import type { Economy } from './economy.js';
import { humanWeight, moneyAmount } from './helpers.js';
import { distributeIncome, redistributeToUnemployed } from './income.js';

export { distributeIncome, redistributeToUnemployed } from './income.js';

export function onGovernment(economy: Economy): void {
  collectTax(economy);
  const grants = payUbi(economy);
  buyGoods(economy);
  distributeIncome(economy);
  redistributeToUnemployed(economy);
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    const grant = grants[index] ?? 0;
    if (household && grant > 0) {
      household.income += grant;
    }
  }
  sweepAgents(economy);
  for (const household of economy.households) {
    household.smoothed = Math.round(0.9 * household.smoothed + 0.1 * household.income);
  }
  for (const agent of economy.agents) {
    agent.smoothed = 0.9 * agent.smoothed + 0.1 * agent.income;
  }
  if (economy.govDeposits < 0) {
    issueBonds(economy, -economy.govDeposits);
  }
}

function collectTax(economy: Economy): void {
  let tax = 0;
  let agentTax = 0;
  for (const household of economy.households) {
    const bill = Math.round(economy.params.taxRate * household.income);
    const paid = Math.min(household.deposit, bill);
    household.deposit -= paid;
    tax += paid;
  }
  for (const agent of economy.agents) {
    const bill = moneyAmount(economy, economy.params.taxRate * agent.income);
    const paid = Math.min(agent.deposit, bill);
    agent.deposit -= paid;
    tax += paid;
    agentTax += paid;
  }
  economy.govDeposits += tax;
  economy.taxRevenue = tax;
  economy.agentTaxRevenue = agentTax;
}

function payUbi(economy: Economy): number[] {
  const grants = new Array<number>(economy.households.length).fill(0);
  economy.ubiOutlay = 0;
  const aiShare = economy.aiFactor > 1 ? 1 - humanWeight(economy) : 0;
  const nominalGdp = economy.priceLevel * economy.realGdp;
  const grantPool = Math.max(0, Math.round(economy.params.ubiShare * aiShare * nominalGdp));
  if (grantPool <= 0 || economy.households.length === 0) {
    return grants;
  }
  if (economy.govDeposits < grantPool) {
    issueBonds(economy, grantPool - Math.max(0, economy.govDeposits));
  }
  const parts = splitEqual(grantPool, economy.households.length);
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    const share = parts[index] ?? 0;
    if (!household) {
      continue;
    }
    grants[index] = share;
    household.deposit += share;
    economy.ubiOutlay += share;
  }
  economy.govDeposits -= economy.ubiOutlay;
  return grants;
}

function buyGoods(economy: Economy): void {
  const purchases = Math.max(0, Math.round(economy.params.spendShare * economy.demandBase));
  if (economy.govDeposits < purchases) {
    issueBonds(economy, purchases - Math.max(0, economy.govDeposits));
  }
  let remaining = purchases;
  const byStock = [...economy.firms].sort((left, right) => right.inventory - left.inventory);
  for (const firm of byStock) {
    if (remaining <= 0 || firm.inventory <= 0 || firm.price <= 0) {
      continue;
    }
    const units = Math.min(firm.inventory, remaining / firm.price);
    const bill = Math.min(remaining, Math.round(units * firm.price));
    if (bill <= 0) {
      continue;
    }
    firm.deposit += bill;
    firm.inventory -= bill / firm.price;
    economy.govDeposits -= bill;
    remaining -= bill;
  }
}

export function issueBonds(economy: Economy, amount: number): void {
  if (amount <= 0) {
    return;
  }
  economy.govDeposits += amount;
  const buyer = economy.banks[0];
  if (buyer) {
    buyer.bonds += amount;
  }
}

function sweepAgents(economy: Economy): void {
  const retain = economy.wageLevel * 0.01;
  for (const agent of economy.agents) {
    const sweep = agent.deposit - retain;
    if (sweep <= 0) {
      continue;
    }
    const owner = economy.households[agent.owner];
    if (!owner) {
      continue;
    }
    agent.deposit -= sweep;
    owner.deposit += sweep;
  }
}
