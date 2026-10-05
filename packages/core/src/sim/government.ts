import { splitEqual } from './allocate.js';
import type { Economy } from './economy.js';
import { employedCount, moneyAmount, naturalUnemployment, savingsRoom } from './helpers.js';
import { distributeIncome, redistributeToUnemployed } from './income.js';
import { clamp } from './stats.js';

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
  const unemployment = 1 - employedCount(economy) / Math.max(1, economy.households.length);
  const gap = Math.max(0, unemployment - naturalUnemployment(economy));
  economy.fiscalBoost =
    economy.params.regime === 'fiat' && economy.params.stabilizer > 0
      ? economy.params.stabilizer * gap
      : 0;
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
  const aiShare = economy.aiFactor > 1 ? 1 - 1 / economy.aiFactor : 0;
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

function effectiveSpendShare(economy: Economy): number {
  const share = economy.params.spendShare;
  const stabilizer = economy.params.stabilizer;
  if (stabilizer <= 0) {
    return share;
  }
  if (economy.params.regime === 'fiat') {
    const unemployment = 1 - employedCount(economy) / economy.households.length;
    const gap = Math.max(0, unemployment - naturalUnemployment(economy));
    return clamp(share + stabilizer * gap, 0, 0.8);
  }
  return share;
}

function buyGoods(economy: Economy): void {
  let purchases = Math.max(0, Math.round(effectiveSpendShare(economy) * economy.demandBase));
  if (economy.params.regime !== 'fiat' && economy.params.stabilizer > 0) {
    const room = Math.max(0, economy.govDeposits) + Math.max(0, savingsRoom(economy));
    purchases = Math.min(purchases, Math.round(room));
  }
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
  economy.govGoodsSpend = purchases - remaining;
}

export function issueBonds(economy: Economy, amount: number): void {
  if (amount <= 0) {
    return;
  }
  economy.govDeposits += amount;
  const purchaseShare =
    economy.params.regime === 'fiat' ? clamp(economy.params.bondPurchaseShare, 0, 1) : 0;
  const monetized = moneyAmount(economy, amount * purchaseShare);
  const bankShare = amount - monetized;
  const buyer = economy.banks[0];
  if (buyer && bankShare > 0) {
    buyer.bonds += bankShare;
  }
  if (buyer && monetized > 0) {
    buyer.bonds += monetized;
    buyer.reserves += monetized;
  }
}

function sweepAgents(economy: Economy): void {
  economy.agentSweep = 0;
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
    economy.agentSweep += sweep;
  }
}
