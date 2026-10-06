import { powerWeights, splitEqual, splitProportional } from './allocate.js';
import type { Economy } from './economy.js';
import { employedCount, moneyAmount, naturalUnemployment, pay, savingsRoom } from './helpers.js';
import { clamp } from './stats.js';

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

function issueBonds(economy: Economy, amount: number): void {
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

/** Move a slice of earned income to unemployed households without changing the total. */
export function redistributeToUnemployed(economy: Economy): void {
  const unemployed = economy.households.filter((household) => household.employer < 0);
  const employed = economy.households.filter((household) => household.employer >= 0);
  if (unemployed.length === 0 || employed.length === 0) {
    return;
  }
  const earned = employed.reduce((sum, household) => sum + household.income, 0);
  const pool = Math.min(earned, Math.round(0.05 * earned));
  let taken = 0;
  for (const household of employed) {
    const cut =
      earned > 0 ? Math.min(household.income, Math.round((pool * household.income) / earned)) : 0;
    const paid = Math.min(household.deposit, cut);
    household.deposit -= paid;
    household.income -= paid;
    taken += paid;
  }
  const parts = splitEqual(taken, unemployed.length);
  for (let index = 0; index < unemployed.length; index += 1) {
    const household = unemployed[index];
    const share = parts[index] ?? 0;
    if (!household) {
      continue;
    }
    household.deposit += share;
    household.income += share;
  }
}

/**
 * Pay wages from firm receipts, then distribute the residual as profit shares.
 * Ownership weights rise faster than skill, so wealth stays more unequal than income.
 */
export function distributeIncome(economy: Economy): void {
  const wagePaid = new Array<number>(economy.households.length).fill(0);
  let profitPool = 0;
  for (const firm of economy.firms) {
    const pays: { id: number; amount: number }[] = [];
    let owed = 0;
    for (const workerId of firm.workers) {
      const worker = economy.households[workerId];
      if (!worker) {
        continue;
      }
      const amount = pay(worker, firm);
      owed += amount;
      pays.push({ id: workerId, amount });
    }
    const available = Math.max(0, Math.round(firm.deposit));
    const wageBudget = Math.min(available, owed);
    const weights = pays.map((item) => item.amount);
    const parts = owed > 0 && wageBudget > 0 ? splitProportional(wageBudget, weights) : [];
    for (let index = 0; index < pays.length; index += 1) {
      const item = pays[index];
      const share = parts[index] ?? 0;
      if (!item) {
        continue;
      }
      wagePaid[item.id] = (wagePaid[item.id] ?? 0) + share;
    }
    profitPool += available - parts.reduce((sum, value) => sum + value, 0);
    firm.deposit -= available;
  }
  economy.wageBill = wagePaid.reduce((sum, amount) => sum + amount, 0);
  const concentration =
    1.5 + (economy.aiFactor > 1 ? economy.params.ownership * (economy.aiFactor - 1) : 0);
  const weights = powerWeights(
    economy.households.map((household) => household.skill),
    concentration,
  );
  const profits = splitProportional(profitPool, weights);
  economy.profitPaid = profits.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    if (!household) {
      continue;
    }
    const share = profits[index] ?? 0;
    const wages = wagePaid[index] ?? 0;
    household.deposit += wages + share;
    household.income = wages + share;
  }
}
