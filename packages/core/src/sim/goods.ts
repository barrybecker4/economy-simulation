import { INVENTORY_MONTHS, MAX_MONTHLY_PRICE_MOVE, WEALTH_MPC } from './rules.js';
import { clamp } from './stats.js';
import type { Economy } from './economy.js';
import { firmCapacity, moneyAmount, pay, priceTrend } from './helpers.js';
import { buyFromFirms } from './shop.js';

export function onGoods(economy: Economy): void {
  economy.consumptionSpend = 0;
  economy.demandBase = 0;
  for (const household of economy.households) {
    economy.demandBase += household.smoothed;
  }
  for (const household of economy.households) {
    const mpc = clamp(
      1 - economy.params.spendShare + household.timePref - economy.params.timePrefMean,
      0.35,
      0.95,
    );
    const buffer = household.income * 48;
    const extra = Math.max(0, household.deposit - buffer) * WEALTH_MPC;
    const budget = household.smoothed * mpc * (1 + economy.demandImpulse) + extra;
    const left = Math.max(0, Math.min(household.deposit, Math.round(budget)));
    const start =
      economy.firms.length > 0 ? household.search.uniformInt(0, economy.firms.length - 1) : 0;
    const { spent, bought } = buyFromFirms(economy.firms, left, start, economy.params.sampleSize);
    household.deposit -= spent;
    household.consumption = spent;
    household.realConsumption = bought;
    economy.consumptionSpend += spent;
  }
  tradeAgents(economy);
  shopAgents(economy);
  updatePrices(economy);
}

function tradeAgents(economy: Economy): void {
  if (economy.agents.length === 0) {
    economy.agentVolume = 0;
    return;
  }
  economy.agentVolume = 0;
  const friction =
    economy.params.regime === 'fiat' ? economy.params.frictionFiat : economy.params.frictionBitcoin;
  const ask = economy.wageLevel * 0.04 * (1 + friction);
  if (ask >= economy.wageLevel * 0.042) {
    for (const agent of economy.agents) {
      agent.income = 0;
    }
    return;
  }
  for (const agent of economy.agents) {
    const firm = economy.firms[agent.id % economy.firms.length];
    const bank = firm ? economy.banks[firm.bank] : undefined;
    if (!firm || !bank || firm.deposit < ask) {
      agent.income = 0;
      continue;
    }
    const bill = moneyAmount(economy, ask);
    if (bill <= 0 || firm.deposit < bill) {
      agent.income = 0;
      continue;
    }
    const fee = moneyAmount(economy, bill * friction);
    const net = bill - fee;
    firm.deposit -= bill;
    agent.deposit += net;
    agent.income = net;
    if (fee > 0) {
      bank.equity += fee;
      economy.privateEquity -= fee;
    }
    economy.agentVolume += bill;
  }
}

function shopAgents(economy: Economy): void {
  economy.agentGoodsSpend = 0;
  if (economy.agents.length === 0 || economy.firms.length === 0) {
    return;
  }
  const mpc = clamp(1 - economy.params.spendShare, 0.35, 0.95);
  for (const agent of economy.agents) {
    const taxReserve = moneyAmount(economy, economy.params.taxRate * agent.income);
    const buffer = agent.income * 48;
    const extra = Math.max(0, agent.deposit - buffer) * WEALTH_MPC;
    const budget = agent.smoothed * mpc * (1 + economy.demandImpulse) + extra;
    const left = Math.max(0, Math.min(Math.max(0, agent.deposit - taxReserve), Math.round(budget)));
    const start = agent.id % economy.firms.length;
    const { spent } = buyFromFirms(economy.firms, left, start, economy.params.sampleSize);
    agent.deposit -= spent;
    economy.agentGoodsSpend += spent;
    economy.consumptionSpend += spent;
  }
}

function updatePrices(economy: Economy): void {
  let output = 0;
  let weightedPrice = 0;
  for (const firm of economy.firms) {
    const capacity = firmCapacity(economy, firm);
    const wageBill = firm.workers.reduce((sum, workerId) => {
      const worker = economy.households[workerId];
      return sum + (worker ? pay(worker, firm) : 0);
    }, 0);
    const unitCost = capacity > 0 ? wageBill / capacity : firm.price / (1 + economy.params.markup);
    const pressure = clamp(
      (INVENTORY_MONTHS * Math.max(capacity, 1)) / Math.max(firm.inventory, 0.25),
      0.98,
      1.02,
    );
    const costTarget = unitCost * (1 + economy.params.markup) * pressure;
    const trend = priceTrend(economy);
    const nudge = clamp(
      economy.params.priceSpeed * 0.01 * (costTarget / Math.max(firm.price, 1) - 1),
      -0.001,
      0.001,
    );
    const shockTilt = 0.12 * economy.demandImpulse - 0.12 * economy.productivityImpulse;
    const move = clamp(trend + nudge + shockTilt, -MAX_MONTHLY_PRICE_MOVE, MAX_MONTHLY_PRICE_MOVE);
    firm.price = Math.max(1, firm.price * (1 + move));
    firm.salesUnits = 0;
    output += firm.output;
    weightedPrice += firm.price * Math.max(capacity, 0);
  }
  economy.realGdp = output;
  economy.priceLevel = output > 0 ? weightedPrice / output : economy.priceLevel;
  economy.priceHistory.push(economy.priceLevel);
  economy.gdpHistory.push(economy.realGdp);
}
