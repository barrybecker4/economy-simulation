import { splitBasket, type BasketSplit } from './basket.js';
import type { Economy } from './economy.js';
import { refreshEquityClaims } from './equity.js';
import { deflationPenalty, employedCount } from './helpers.js';
import { clamp, distributionOf, mean, median } from './stats.js';

/** Housing security, in [0, 1], adds at most this much to log real consumption. */
export const HOUSING_SECURITY_WEIGHT = 0.5;

export interface HouseholdMeasures {
  categories: BasketSplit;
  housingSecurity: number;
  employed: number;
  income: ReturnType<typeof distributionOf>;
  wealth: ReturnType<typeof distributionOf>;
  /** Nominal sum of the cash part of non-negative household wealth. */
  cashWealthTotal: number;
  /** Nominal sum of the capital-claim part of non-negative household wealth. */
  claimWealthTotal: number;
  skill: ReturnType<typeof distributionOf>;
  consumption: ReturnType<typeof distributionOf>;
  wellbeingMean: number;
  wellbeingMedian: number;
  consumptionFloorShare: number;
}

export function measureHouseholds(economy: Economy): HouseholdMeasures {
  if (economy.households.length === 0) {
    throw new Error('Welfare needs at least one household');
  }
  const incomes = economy.households.map((household) => household.income);
  const consumption = economy.households.map((household) => household.realConsumption);
  const categories = categoryPrices(economy);
  const securities = housingSecurities(economy, incomes, categories);
  const wellbeing = wellbeingOf(consumption, securities);
  const consumptionStats = distributionOf(consumption);
  const wellbeingStats = distributionOf(wellbeing);
  const holdings = householdHoldings(economy);
  return {
    categories,
    housingSecurity: mean(securities),
    employed: employedCount(economy),
    income: distributionOf(incomes),
    wealth: distributionOf(holdings.map((holding) => holding.combined)),
    cashWealthTotal: holdings.reduce((sum, holding) => sum + holding.cashPart, 0),
    claimWealthTotal: holdings.reduce((sum, holding) => sum + holding.claimPart, 0),
    skill: distributionOf(economy.households.map((household) => household.skill)),
    consumption: consumptionStats,
    wellbeingMean: wellbeingStats.mean,
    wellbeingMedian: wellbeingStats.median,
    consumptionFloorShare: shareBelow(consumption, consumptionStats.median * 0.25),
  };
}

/** Agent deposits over household deposits plus agent deposits. */
export function aiShareOfWealth(economy: Economy): number {
  const householdWealth = sumCash(economy.households, economy.bitcoinPrice);
  const agentWealth = sumCash(economy.agents, economy.bitcoinPrice);
  const total = householdWealth + agentWealth;
  return total > 0 ? agentWealth / total : 0;
}

/** Deposits of households that own at least one agent, over all household deposits. */
export function ownerWealthShare(economy: Economy): number {
  if (economy.agents.length === 0 || economy.households.length === 0) {
    return 0;
  }
  const owners = new Set(economy.agents.map((agent) => agent.owner));
  let ownerWealth = 0;
  let total = 0;
  for (const household of economy.households) {
    const deposit = Math.max(0, household.deposit + household.bitcoin * economy.bitcoinPrice);
    total += deposit;
    if (owners.has(household.id)) {
      ownerWealth += deposit;
    }
  }
  return total > 0 ? ownerWealth / total : 0;
}

/** Unemployed, employed at a firm at or below median size, employed at a larger firm. */
export function jobShares(economy: Economy): {
  unemployed: number;
  small: number;
  large: number;
} {
  const households = economy.households.length;
  if (households === 0) {
    return { unemployed: 0, small: 0, large: 0 };
  }
  const medianSize = median(economy.firms.map((firm) => firm.workers.length));
  let unemployed = 0;
  let small = 0;
  let large = 0;
  for (const household of economy.households) {
    if (household.employer < 0) {
      unemployed += 1;
      continue;
    }
    const size = economy.firms[household.employer]?.workers.length ?? 0;
    if (size <= medianSize) {
      small += 1;
    } else {
      large += 1;
    }
  }
  return {
    unemployed: unemployed / households,
    small: small / households,
    large: large / households,
  };
}

interface WealthHolding {
  /** Non-negative combined cash plus claim. */
  combined: number;
  cashPart: number;
  claimPart: number;
}

/**
 * Partition each household's non-negative wealth into cash and capital claims.
 * Combined is max(0, cash + claim). Cash part is min(combined, max(cash, 0));
 * the rest is the claim part.
 */
function householdHoldings(economy: Economy): WealthHolding[] {
  const price = economy.bitcoinPrice;
  const cashOf = (household: { deposit: number; bitcoin: number }) =>
    household.deposit + household.bitcoin * price;
  if (economy.params.equityMarket === 'on') {
    refreshEquityClaims(economy);
  }
  return economy.households.map((household, index) => {
    const cash = cashOf(household);
    const claim = economy.params.equityMarket === 'on' ? (economy.equityClaims[index] ?? 0) : 0;
    const combined = Math.max(0, cash + claim);
    const cashPart = Math.min(combined, Math.max(cash, 0));
    return { combined, cashPart, claimPart: combined - cashPart };
  });
}

function categoryPrices(economy: Economy): BasketSplit {
  return splitBasket({
    cpi: economy.priceLevel,
    years: economy.tick / 12,
    baselineGrowth: economy.params.prodGrowth,
    productivity: economy.params.categoryGrowth,
    housingSupplyGrowth: economy.params.housingSupplyGrowth,
    deflationPenalty: deflationPenalty(economy),
    housingPressure: economy.params.marketClearing === 'on' ? economy.housingPressure : 1,
  });
}

function housingSecurities(
  economy: Economy,
  incomes: readonly number[],
  categories: BasketSplit,
): number[] {
  const price = Math.max(economy.priceLevel, 1);
  const typical = Math.max(distributionOf(incomes).median / price, 0.01);
  const relativeHousing = categories.priceHousing / price;
  return incomes.map((income) => clamp(income / price / typical / (1 + relativeHousing), 0, 1));
}

function wellbeingOf(consumption: readonly number[], securities: readonly number[]): number[] {
  return consumption.map(
    (value, index) =>
      Math.log(Math.max(value, 0.01)) + HOUSING_SECURITY_WEIGHT * (securities[index] ?? 0),
  );
}

function shareBelow(values: readonly number[], floor: number): number {
  let below = 0;
  for (const value of values) {
    if (value < floor) {
      below += 1;
    }
  }
  return below / values.length;
}

function sumCash(holders: readonly { deposit: number; bitcoin: number }[], price: number): number {
  let total = 0;
  for (const holder of holders) {
    total += holder.deposit + holder.bitcoin * price;
  }
  return total;
}
