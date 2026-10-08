import { tradeAgents, shopAgents, type GoodsMarket } from './agent-trade.js';
import { firmCapacity } from './capacity.js';
import type { Economy } from './economy.js';
import { expectedInflation, normalInflation, pay, priceTrend } from './helpers.js';
import { debitDeposit } from './money.js';
import { inventoryPressure, monthlyPriceMove } from './pricing.js';
import { CONSUMER_LOAN_REPAY, EXCESS_DEMAND_CAP } from './rules.js';
import { buyFromFirms } from './shop.js';
import { goodsBudget, goodsSpendingShare, subsistenceShare } from './spending.js';
import { clamp } from './stats.js';
import type { Firm } from './types.js';

export function onGoods(economy: Economy): void {
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
  economy.consumptionSpend = 0;
  economy.desiredSpend = 0;
  economy.demandBase = demandBase(economy);
  const market = goodsMarket(economy);
  shopHouseholds(economy, market);
  tradeAgents(economy);
  shopAgents(economy, market);
  updatePrices(economy);
}

function demandBase(economy: Economy): number {
  let total = 0;
  for (const household of economy.households) {
    total += household.smoothed;
  }
  return total;
}

function goodsMarket(economy: Economy): GoodsMarket {
  const inflationRate = expectedInflation(economy);
  const depositYield = economy.paidDepositRate > 0 ? economy.paidDepositRate : economy.depositRate;
  return {
    floorShare: subsistenceShare(),
    inflationGap: inflationRate - normalInflation(economy),
    realReturn: depositYield - inflationRate,
    demandFactor: 1 + economy.demandImpulse + economy.fiscalBoost,
  };
}

function shopHouseholds(economy: Economy, market: GoodsMarket): void {
  for (const household of economy.households) {
    const budget = goodsBudget({
      smoothed: household.smoothed,
      income: household.income,
      deposit: household.deposit,
      spendingShare: spendingShare(economy, household.timePref, market.inflationGap),
      demandFactor: market.demandFactor,
      realReturn: market.realReturn,
      realReturnSensitivity: economy.params.realReturnSensitivity,
      floorShare: market.floorShare,
      durableShare: economy.params.durableShare,
    });
    economy.desiredSpend += budget;
    // Keep this month's debt service in the deposit. A larger goods budget,
    // including a treasury rebate, would otherwise be spent before mortgages.
    const reserved = household.mortgagePayment + household.consumerLoan * CONSUMER_LOAN_REPAY;
    const spendable = Math.max(0, household.deposit - reserved);
    const left = Math.max(0, Math.min(spendable, Math.round(budget)));
    const start =
      economy.firms.length > 0 ? household.search.uniformInt(0, economy.firms.length - 1) : 0;
    const { spent, bought } = buyFromFirms(economy.firms, left, start, economy.params.sampleSize);
    debitDeposit(household, spent);
    household.consumption = spent;
    household.realConsumption = bought;
    economy.consumptionSpend += spent;
  }
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

function updatePrices(economy: Economy): void {
  const excessDemand = excessDemandRatio(economy);
  let output = 0;
  let weightedPrice = 0;
  for (const firm of economy.firms) {
    reprice(economy, firm, excessDemand);
    output += firm.output;
    weightedPrice += firm.price * Math.max(firmCapacity(economy, firm), 0);
  }
  economy.realGdp = output;
  economy.priceLevel = output > 0 ? weightedPrice / output : economy.priceLevel;
  economy.priceHistory.push(economy.priceLevel);
  economy.gdpHistory.push(economy.realGdp);
}

function excessDemandRatio(economy: Economy): number {
  let capacityValue = 0;
  for (const firm of economy.firms) {
    capacityValue += firmCapacity(economy, firm) * firm.price;
  }
  if (capacityValue <= 0) {
    return 0;
  }
  return clamp(economy.desiredSpend / capacityValue - 1, -EXCESS_DEMAND_CAP, EXCESS_DEMAND_CAP);
}

function reprice(economy: Economy, firm: Firm, excessDemand: number): void {
  const capacity = firmCapacity(economy, firm);
  const wageBill = firm.workers.reduce((sum, workerId) => {
    const worker = economy.households[workerId];
    return sum + (worker ? pay(worker, firm) : 0);
  }, 0);
  const unitCost = capacity > 0 ? wageBill / capacity : firm.price / (1 + economy.params.markup);
  const move = monthlyPriceMove({
    price: firm.price,
    unitCost,
    markup: economy.params.markup,
    pressure: inventoryPressure(capacity, firm.inventory),
    priceSpeed: economy.params.priceSpeed,
    trend: priceTrend(economy),
    excessDemand,
    trendWeight: economy.params.trendWeight,
    demandImpulse: economy.demandImpulse,
    productivityImpulse: economy.productivityImpulse,
  });
  firm.price = Math.max(1, firm.price * (1 + move));
}
