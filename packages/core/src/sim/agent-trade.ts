import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { payFromCash, spendableCash } from './dual-currency.js';
import { collectBankFee, creditDeposit, debitDeposit } from './money.js';
import { AI_SERVICE_PRICE_CAP, AI_SERVICE_WAGE_SHARE } from './rules.js';
import { buyFromFirms } from './shop.js';
import { goodsBudget, goodsSpendingShare } from './spending.js';
import type { Agent } from './types.js';

export interface GoodsMarket {
  floorShare: number;
  inflationGap: number;
  realReturn: number;
  demandFactor: number;
}

/** Ask for one compute unit. Depth 0 is the adoption price marked up by friction. */
export function quotedServicePrice(input: {
  wage: number;
  progress: number;
  friction: number;
  depth: number;
  agents: number;
  firms: number;
}): number {
  const base = input.wage * AI_SERVICE_WAGE_SHARE * input.progress * (1 + input.friction);
  if (input.depth <= 0 || input.firms <= 0) {
    return base;
  }
  return base * (1 + input.depth * (input.agents / input.firms));
}

export function tradeAgents(economy: Economy): void {
  economy.agentVolume = 0;
  economy.agentFees = 0;
  if (economy.agents.length === 0) {
    return;
  }
  const friction = paymentFriction(economy);
  const progress = economy.adoptionProgress;
  const ask = quotedServicePrice({
    wage: economy.wageLevel,
    progress,
    friction,
    depth: economy.params.marketDepth,
    agents: economy.agents.length,
    firms: economy.firms.length,
  });
  if (!(economy.wageLevel > 0 && ask < economy.wageLevel * AI_SERVICE_PRICE_CAP)) {
    clearAgentIncome(economy);
    return;
  }
  for (const agent of economy.agents) {
    sellCompute(economy, agent, ask, friction);
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

function sellCompute(economy: Economy, agent: Agent, ask: number, friction: number): void {
  const firm = economy.firms[agent.id % economy.firms.length];
  const bank = firm ? economy.banks[firm.bank] : undefined;
  if (!firm || !bank || firm.deposit < ask) {
    agent.income = 0;
    return;
  }
  const bill = moneyAmount(economy, ask);
  if (bill <= 0 || firm.deposit < bill) {
    agent.income = 0;
    return;
  }
  const fee = moneyAmount(economy, bill * friction);
  debitDeposit(firm, bill);
  creditDeposit(agent, bill - fee);
  firm.computeReady += 1;
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
