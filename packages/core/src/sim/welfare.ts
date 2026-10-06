import type { TickContext } from '../engine/engine.js';
import { splitBasket } from './basket.js';
import { assembleMetrics, type MetricSnapshot, type TenureReading } from './assemble-metrics.js';
import { clamp, distributionOf, mean, median } from './stats.js';
import type { Economy } from './economy.js';
import {
  deflationPenalty,
  employedCount,
  growth,
  inflation,
  naturalUnemployment,
  savingsStock,
  totalDeposits,
  totalLoans,
} from './helpers.js';

export function onWelfare(economy: Economy, ctx: TickContext): void {
  assembleMetrics(metricSnapshot(economy), ctx.metrics);
  economy.defaultsThisTick = 0;
}

function metricSnapshot(economy: Economy): MetricSnapshot {
  const welfare = measureWelfare(economy);
  const reserves = economy.banks.reduce((sum, bank) => sum + bank.reserves, 0);
  return {
    realGdp: economy.realGdp,
    growth: growth(economy),
    employed: welfare.employed,
    householdCount: economy.households.length,
    agentCount: economy.agents.length,
    priceLevel: economy.priceLevel,
    categories: welfare.categories,
    housingSecurity: welfare.housingSecurity,
    inflation: inflation(economy),
    interestRate: economy.policyRate,
    deflationSensitivity: economy.params.deflationSensitivity,
    deposits: totalDeposits(economy),
    reserves,
    loans: totalLoans(economy),
    savings: savingsStock(economy),
    tick: economy.tick,
    prodGrowth: economy.params.prodGrowth,
    housingSupplyGrowth: economy.params.housingSupplyGrowth,
    tenureChoice: economy.params.tenureChoice,
    tenure: economy.params.tenureChoice === 'on' ? readTenure(economy) : null,
    investmentHurdle: economy.params.investmentHurdle,
    loanFinance: economy.loanFinance,
    profitSharingFinance: economy.profitSharingFinance,
    consumptionSpend: economy.consumptionSpend,
    investmentSpend: economy.investmentSpend,
    agentGoodsSpend: economy.agentGoodsSpend,
    govGoodsSpend: economy.govGoodsSpend,
    agentVolume: economy.agentVolume,
    agentFees: economy.agentFees,
    agentSweep: economy.agentSweep,
    interestPaid: economy.interestPaid,
    newBorrowing: economy.newBorrowing,
    loanRepaid: economy.loanRepaid,
    taxRevenue: economy.taxRevenue,
    agentTaxRevenue: economy.agentTaxRevenue,
    ubiOutlay: economy.ubiOutlay,
    wageBill: economy.wageBill,
    profitPaid: economy.profitPaid,
    wageLevel: economy.wageLevel,
    demandImpulse: economy.demandImpulse,
    creditImpulse: economy.creditImpulse,
    productivityImpulse: economy.productivityImpulse,
    realInvestment: economy.realInvestment,
    defaultsThisTick: economy.defaultsThisTick,
    cumulativeFailures: economy.cumulativeFailures,
    boomLength: economy.boomLength,
    bustLength: economy.bustLength,
    nominalOutput: economy.priceLevel * economy.realGdp,
    income: welfare.income,
    wealth: welfare.wealth,
    skill: welfare.skill,
    consumption: welfare.consumption,
    wellbeingMean: welfare.wellbeingMean,
    wellbeingMedian: welfare.wellbeingMedian,
    consumptionFloorShare: welfare.consumptionFloorShare,
    jobs: jobShares(economy),
    ownerWealthShare: ownerWealthShare(economy),
    aiShareOfWealth: aiShareOfWealth(economy),
    aiFactor: economy.aiFactor,
    automatedShare: economy.automatedShare,
    naturalUnemployment: naturalUnemployment(economy),
  };
}

function measureWelfare(economy: Economy): {
  categories: ReturnType<typeof splitBasket>;
  housingSecurity: number;
  employed: number;
  income: ReturnType<typeof distributionOf>;
  wealth: ReturnType<typeof distributionOf>;
  skill: ReturnType<typeof distributionOf>;
  consumption: ReturnType<typeof distributionOf>;
  wellbeingMean: number;
  wellbeingMedian: number;
  consumptionFloorShare: number;
} {
  const incomes = economy.households.map((household) => household.income);
  const consumption = economy.households.map((household) => household.realConsumption);
  const categories = categoryPrices(economy);
  const relativeHousing = categories.priceHousing / Math.max(economy.priceLevel, 1);
  const price = Math.max(economy.priceLevel, 1);
  const income = distributionOf(incomes);
  const typical = Math.max(income.median / price, 0.01);
  const securities = incomes.map((incomeValue) =>
    clamp(incomeValue / price / typical / (1 + relativeHousing), 0, 1),
  );
  const wellbeing = consumption.map(
    (value, index) =>
      Math.log(Math.max(value, 0.01)) + economy.params.housingWeight * (securities[index] ?? 0),
  );
  const consumptionStats = distributionOf(consumption);
  const floor = consumptionStats.median * 0.25;
  let below = 0;
  for (const value of consumption) {
    if (value < floor) {
      below += 1;
    }
  }
  const wellbeingStats = distributionOf(wellbeing);
  return {
    categories,
    housingSecurity: mean(securities),
    employed: employedCount(economy),
    income,
    wealth: distributionOf(economy.households.map((household) => household.deposit)),
    skill: distributionOf(economy.households.map((household) => household.skill)),
    consumption: consumptionStats,
    wellbeingMean: wellbeingStats.mean,
    wellbeingMedian: wellbeingStats.median,
    consumptionFloorShare: below / economy.households.length,
  };
}

function readTenure(economy: Economy): TenureReading {
  let mortgageCount = 0;
  let rentCount = 0;
  let ownedCount = 0;
  let consumerCredit = 0;
  const debtService: number[] = [];
  for (const household of economy.households) {
    if (household.tenure === 'mortgage') {
      mortgageCount += 1;
    } else if (household.tenure === 'owned') {
      ownedCount += 1;
    } else {
      rentCount += 1;
    }
    consumerCredit += household.consumerLoan;
    const income = Math.max(household.income, 1);
    debtService.push((household.mortgagePayment + household.consumerLoan * 0.05) / income);
  }
  return {
    mortgageCount,
    rentCount,
    ownedCount,
    tenureChanges: economy.tenureChanges,
    consumerCredit,
    medianDebtService: median(debtService),
    newConsumerBorrowing: economy.newConsumerBorrowing,
  };
}

/** Agent deposits over household deposits plus agent deposits. */
export function aiShareOfWealth(economy: Economy): number {
  let householdWealth = 0;
  for (const household of economy.households) {
    householdWealth += household.deposit;
  }
  let agentWealth = 0;
  for (const agent of economy.agents) {
    agentWealth += agent.deposit;
  }
  const total = householdWealth + agentWealth;
  return total > 0 ? agentWealth / total : 0;
}

/** Deposits of households that own at least one agent, over all household deposits. */
export function ownerWealthShare(economy: Economy): number {
  if (economy.agents.length === 0 || economy.households.length === 0) {
    return 0;
  }
  // Owners are the first round(households * (1 - ownership)) household ids.
  const ownerCount = Math.max(
    1,
    Math.round(economy.households.length * (1 - economy.params.ownership)),
  );
  let ownerWealth = 0;
  let total = 0;
  for (const household of economy.households) {
    const deposit = Math.max(0, household.deposit);
    total += deposit;
    if (household.id < ownerCount) {
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
  const sizes = new Array<number>(economy.firms.length);
  for (let index = 0; index < economy.firms.length; index += 1) {
    sizes[index] = economy.firms[index]?.workers.length ?? 0;
  }
  const medianSize = median(sizes);
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

function categoryPrices(economy: Economy): ReturnType<typeof splitBasket> {
  return splitBasket({
    cpi: economy.priceLevel,
    years: economy.tick / 12,
    baselineGrowth: economy.params.prodGrowth,
    productivity: economy.params.categoryGrowth,
    housingSupplyGrowth: economy.params.housingSupplyGrowth,
    deflationPenalty: deflationPenalty(economy),
  });
}
