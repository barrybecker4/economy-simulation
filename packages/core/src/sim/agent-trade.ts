import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { payFromCash, spendableCash } from './dual-currency.js';
import { collectBankFee, creditDeposit, debitDeposit } from './money.js';
import { agentTakeup, quotedServicePrice, realUnitCost } from './agent-cost.js';
import { INITIAL_WAGE } from './rules.js';
import { buyFromFirms } from './shop.js';
import { goodsBudget, goodsSpendingShare } from './spending.js';
import type { Agent } from './types.js';

export interface GoodsMarket {
  floorShare: number;
  inflationGap: number;
  realReturn: number;
  demandFactor: number;
}

export { quotedServicePrice, realUnitCost, agentTakeup } from './agent-cost.js';

export function tradeAgents(economy: Economy): void {
  economy.agentVolume = 0;
  economy.agentFees = 0;
  if (economy.agents.length === 0) {
    return;
  }
  const friction = paymentFriction(economy);
  const openingPriceLevel = INITIAL_WAGE * (1 + economy.params.markup);
  const cost = realUnitCost({
    tick: economy.tick,
    openingWage: INITIAL_WAGE,
    initialCostShare: economy.params.agentInitialCostShare,
    costHalvingMonths: economy.params.agentCostHalvingMonths,
    energyStepMonth: economy.params.agentEnergyStepMonth,
    energyStepSize: economy.params.agentEnergyStepSize,
  });
  const ask = quotedServicePrice({
    realUnitCost: cost,
    priceLevel: economy.priceLevel,
    openingPriceLevel,
    friction,
    depth: economy.params.marketDepth,
    agents: economy.agents.length,
    firms: economy.firms.length,
  });
  if (!(ask > 0) || !(economy.wageLevel > 0)) {
    clearAgentIncome(economy);
    return;
  }
  const takeup = agentTakeup({
    ask,
    wage: economy.wageLevel,
    valueWageShare: economy.params.agentValueWageShare,
    demandElasticity: economy.params.agentDemandElasticity,
  });
  if (!(takeup > 0)) {
    clearAgentIncome(economy);
    return;
  }
  for (const agent of economy.agents) {
    sellCompute(economy, agent, ask, takeup, friction);
  }
}

export function shopAgents(economy: Economy, market: GoodsMarket): void {
  economy.agentGoodsSpend = 0;
  if (economy.agents.length === 0 || economy.firms.length === 0) {
    return;
  }
  const share = spendingShare(economy, economy.params.timePrefMean, market.inflationGap);
  for (const agent of economy.agents) {
    buyAgentGoods(economy, agent, market, share);
  }
}

function buyAgentGoods(economy: Economy, agent: Agent, market: GoodsMarket, share: number): void {
  const budget = goodsBudget({
    smoothed: agent.smoothed,
    income: agent.income,
    deposit: agent.deposit + (agent.bitcoin > 0 ? agent.bitcoin * economy.bitcoinPrice : 0),
    spendingShare: share,
    demandFactor: market.demandFactor,
    realReturn: market.realReturn,
    realReturnSensitivity: economy.params.realReturnSensitivity,
    floorShare: market.floorShare,
  });
  economy.desiredSpend += budget;
  const reserve = moneyAmount(economy, economy.params.taxRate * agent.income);
  const cash = spendableCash(economy, agent, reserve);
  const left = Math.max(0, Math.min(cash, Math.round(budget)));
  const { spent } = buyFromFirms(
    economy.firms,
    left,
    agent.id % economy.firms.length,
    economy.params.sampleSize,
  );
  payFromCash(economy, agent, spent, reserve);
  economy.agentGoodsSpend += spent;
  economy.consumptionSpend += spent;
}

function paymentFriction(economy: Economy): number {
  return economy.params.regime === 'fiat'
    ? economy.params.frictionFiat
    : economy.params.frictionBitcoin;
}

function clearAgentIncome(economy: Economy): void {
  for (const agent of economy.agents) {
    agent.income = 0;
  }
}

function sellCompute(
  economy: Economy,
  agent: Agent,
  ask: number,
  takeup: number,
  friction: number,
): void {
  const firm = economy.firms[agent.id % economy.firms.length];
  const bank = firm ? economy.banks[firm.bank] : undefined;
  if (!firm || !bank) {
    agent.income = 0;
    return;
  }
  const continuous = ask * takeup;
  let bill = moneyAmount(economy, continuous);
  // Fiat cents round a tiny bill to zero once real cost has fallen. Keep a
  // one-cent floor so cheaper compute still clears instead of shutting off.
  if (bill <= 0 && continuous > 0 && economy.params.unit === 'cent') {
    bill = 1;
  }
  if (bill <= 0 || firm.deposit < bill) {
    agent.income = 0;
    return;
  }
  let fee = moneyAmount(economy, bill * friction);
  // One-cent sales round a modest fee to zero. When friction is material, keep a
  // one-cent fee so higher friction still leaves agents with less to spend (H4).
  if (fee <= 0 && friction >= 0.05 && bill > 0 && economy.params.unit === 'cent') {
    fee = Math.min(bill, 1);
  }
  debitDeposit(firm, bill);
  creditDeposit(agent, bill - fee);
  firm.computeReady += takeup;
  agent.income = bill - fee;
  if (fee > 0) {
    collectBankFee(bank, economy, fee);
    economy.agentFees += fee;
  }
  economy.agentVolume += bill;
}

function spendingShare(economy: Economy, timePref: number, inflationGap: number): number {
  return goodsSpendingShare({
    governmentShare: economy.params.spendShare,
    timePref,
    timePrefMean: economy.params.timePrefMean,
    inflationGap,
    inflationSensitivity: economy.params.inflationTimePreference,
  });
}
