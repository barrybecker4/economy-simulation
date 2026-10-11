import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { availableCash, payFromCash, spendableCash } from './dual-currency.js';
import { swapAtResidual } from './hybrid-money.js';
import { currencyFor, transferCurrency } from './hybrid-settle.js';
import { collectBankFee, creditDeposit, debitDeposit } from './money.js';
import { agentTakeup, quotedServicePrice, realUnitCost } from './agent-cost.js';
import { INITIAL_WAGE } from './rules.js';
import { buyFromFirms } from './shop.js';
import { goodsBudget, goodsSpendingShare } from './spending.js';
import type { Agent, Bank, Firm, PayCurrency } from './types.js';

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
  if (!(bill > 0) || !firmCanPay(economy, firm, bill)) {
    agent.income = 0;
    return;
  }
  if (economy.params.regime === 'hybrid') {
    sellComputeHybrid(economy, agent, firm, bank, bill, takeup, friction);
    return;
  }
  // Fiat and bitcoin: credit bill − fee in one step so satoshi floats match the
  // pinned cross-engine path (credit-then-debit is not bit-identical).
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

/** Hybrid compute sale: settle in the firm's pay currency, fee via fiat equity. */
function sellComputeHybrid(
  economy: Economy,
  agent: Agent,
  firm: Firm,
  bank: Bank,
  bill: number,
  takeup: number,
  friction: number,
): void {
  const currency = currencyFor(firm);
  const paid = transferCurrency(economy, firm, agent, bill, currency);
  if (!(paid > 0)) {
    agent.income = 0;
    return;
  }
  let fee = moneyAmount(economy, paid * friction);
  if (fee <= 0 && friction >= 0.05 && paid > 0 && economy.params.unit === 'cent') {
    fee = Math.min(paid, 1);
  }
  const taken = takeHybridComputeFee(economy, agent, bank, fee, currency);
  firm.computeReady += takeup;
  agent.income = paid - taken;
  economy.agentVolume += paid;
}

/**
 * Collect payment friction into bank equity from the agent's receipt.
 * Bitcoin pay sells the fee into fiat first so custody assets and equity move
 * together instead of opening a cent gap.
 */
function takeHybridComputeFee(
  economy: Economy,
  agent: Agent,
  bank: Bank,
  fee: number,
  currency: PayCurrency,
): number {
  if (!(fee > 0)) {
    return 0;
  }
  if (currency === 'bitcoin') {
    swapAtResidual(economy, agent, -fee);
  }
  const taken = Math.min(fee, Math.max(0, agent.deposit));
  if (!(taken > 0)) {
    return 0;
  }
  debitDeposit(agent, taken);
  collectBankFee(bank, economy, taken);
  economy.agentFees += taken;
  return taken;
}

function firmCanPay(economy: Economy, firm: Firm, bill: number): boolean {
  if (economy.params.regime === 'hybrid') {
    return availableCash(economy, firm) >= bill;
  }
  return firm.deposit >= bill;
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
