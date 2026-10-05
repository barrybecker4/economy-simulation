import type { TickContext } from '../engine/engine.js';
import { BASKET_METRICS, splitBasket } from './basket.js';
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
  const incomes = economy.households.map((household) => household.income);
  const consumption = economy.households.map((household) => household.realConsumption);
  const wealth = economy.households.map((household) => household.deposit);
  const skills = economy.households.map((household) => household.skill);
  const employed = employedCount(economy);
  const unemployment = 1 - employed / economy.households.length;
  const nominalOutput = economy.priceLevel * economy.realGdp;
  const loans = totalLoans(economy);
  const deposits = totalDeposits(economy);
  const categories = categoryPrices(economy);
  const relativeHousing = categories.priceHousing / Math.max(economy.priceLevel, 1);
  const price = Math.max(economy.priceLevel, 1);
  const incomeStats = distributionOf(incomes);
  const typical = Math.max(incomeStats.median / price, 0.01);
  const securities = incomes.map((income) =>
    clamp(income / price / typical / (1 + relativeHousing), 0, 1),
  );
  const wellbeing = consumption.map(
    (value, index) =>
      Math.log(Math.max(value, 0.01)) + economy.params.housingWeight * (securities[index] ?? 0),
  );
  const wealthStats = distributionOf(wealth);
  const skillStats = distributionOf(skills);
  const consumptionStats = distributionOf(consumption);
  const wellbeingStats = distributionOf(wellbeing);
  const metrics = ctx.metrics;
  metrics.set('realGdp', economy.realGdp);
  metrics.set('growth', growth(economy));
  metrics.set('productivityPerHuman', employed > 0 ? economy.realGdp / employed : 0);
  metrics.set('priceLevel', economy.priceLevel);
  metrics.set('priceGeneral', categories.priceGeneral);
  for (const id of BASKET_METRICS) {
    metrics.set(id, categories[id]);
  }
  metrics.set('housingSecurity', mean(securities));
  metrics.set('inflation', inflation(economy));
  metrics.set('interestRate', economy.policyRate);
  const penalty = deflationPenalty(economy);
  const reserves = economy.banks.reduce((sum, bank) => sum + bank.reserves, 0);
  const savings = savingsStock(economy);
  metrics.set('moneySupply', deposits);
  metrics.set('baseMoney', reserves);
  metrics.set('loanToSavings', savings > 0 ? loans / savings : 0);
  metrics.set('profitSharingShare', 0.15 + 0.7 * penalty);
  metrics.set('nonMortgageHousingShare', 0.25 + 0.6 * penalty);
  const years = economy.tick / 12;
  const scarcity =
    (1 + economy.params.prodGrowth) ** years / (1 + economy.params.housingSupplyGrowth) ** years;
  metrics.set('propertyTurnover', (0.08 * (1 - penalty)) / Math.max(scarcity, 0.25));
  metrics.set(
    'velocity',
    deposits > 0 ? (economy.consumptionSpend + economy.investmentSpend) / deposits : 0,
  );
  metrics.set('creditToGdp', nominalOutput > 0 ? loans / (nominalOutput * 12) : 0);
  metrics.set('defaults', economy.defaultsThisTick);
  metrics.set('bankFailures', economy.cumulativeFailures);
  metrics.set('boomLength', economy.boomLength);
  metrics.set('bustLength', economy.bustLength);
  metrics.set('unemployment', unemployment);
  metrics.set('naturalUnemployment', naturalUnemployment(economy));
  metrics.set('realWage', economy.priceLevel > 0 ? economy.wageLevel / economy.priceLevel : 0);
  metrics.set('laborShare', nominalOutput > 0 ? economy.wageBill / nominalOutput : 0);
  metrics.set('taxRevenue', economy.taxRevenue);
  metrics.set('agentTaxRevenue', economy.agentTaxRevenue);
  metrics.set('ubiOutlay', economy.ubiOutlay);
  metrics.set('wageBill', economy.wageBill);
  metrics.set('profitPaid', economy.profitPaid);
  metrics.set(
    'householdGoodsSpend',
    Math.max(0, economy.consumptionSpend - economy.agentGoodsSpend),
  );
  metrics.set('govGoodsSpend', economy.govGoodsSpend);
  metrics.set('agentGoodsSpend', economy.agentGoodsSpend);
  metrics.set('agentVolume', economy.agentVolume);
  metrics.set('agentFees', economy.agentFees);
  metrics.set('agentSweep', economy.agentSweep);
  metrics.set('interestPaid', economy.interestPaid);
  metrics.set('newBorrowing', economy.newBorrowing);
  metrics.set('loanRepaid', economy.loanRepaid);
  metrics.set('demandImpulse', economy.demandImpulse);
  metrics.set('creditImpulse', economy.creditImpulse);
  metrics.set('productivityImpulse', economy.productivityImpulse);
  metrics.set('giniWealth', wealthStats.gini);
  metrics.set('giniIncome', incomeStats.gini);
  metrics.set('giniSkill', skillStats.gini);
  metrics.set('giniConsumption', consumptionStats.gini);
  metrics.set('realInvestment', economy.realInvestment);
  metrics.set('topDecileWealthShare', wealthStats.topDecile);
  metrics.set('bottomQuintileWealthShare', wealthStats.bottomQuintile);
  metrics.set('wealthQuintile1', wealthStats.quintiles[0]);
  metrics.set('wealthQuintile2', wealthStats.quintiles[1]);
  metrics.set('wealthQuintile3', wealthStats.quintiles[2]);
  metrics.set('wealthQuintile4', wealthStats.quintiles[3]);
  metrics.set('wealthQuintile5', wealthStats.quintiles[4]);
  const jobs = jobShares(economy);
  metrics.set('jobUnemployedShare', jobs.unemployed);
  metrics.set('jobSmallFirmShare', jobs.small);
  metrics.set('jobLargeFirmShare', jobs.large);
  metrics.set('ownerWealthShare', ownerWealthShare(economy));
  metrics.set('meanRealWealth', economy.priceLevel > 0 ? wealthStats.mean / economy.priceLevel : 0);
  metrics.set(
    'medianRealWealth',
    economy.priceLevel > 0 ? wealthStats.median / economy.priceLevel : 0,
  );
  metrics.set('meanRealIncome', economy.priceLevel > 0 ? incomeStats.mean / economy.priceLevel : 0);
  metrics.set(
    'medianRealIncome',
    economy.priceLevel > 0 ? incomeStats.median / economy.priceLevel : 0,
  );
  metrics.set('meanRealConsumption', consumptionStats.mean);
  metrics.set('medianRealConsumption', consumptionStats.median);
  const floor = consumptionStats.median * 0.25;
  let below = 0;
  for (const value of consumption) {
    if (value < floor) {
      below += 1;
    }
  }
  metrics.set('consumptionFloorShare', below / economy.households.length);
  metrics.set('meanWellbeing', wellbeingStats.mean);
  metrics.set('medianWellbeing', wellbeingStats.median);
  const population = economy.households.length + economy.agents.length;
  metrics.set('aiShareOfAgents', population > 0 ? economy.agents.length / population : 0);
  metrics.set('aiShareOfWealth', aiShareOfWealth(economy));
  const activity = economy.consumptionSpend + economy.agentVolume;
  const agentActivity = economy.agentVolume + economy.agentGoodsSpend;
  metrics.set('aiShareOfTransactions', activity > 0 ? agentActivity / activity : 0);
  metrics.set('aiShareOfOutput', economy.aiFactor > 1 ? 1 - 1 / economy.aiFactor : 0);
  metrics.set('tasksAutomated', economy.automatedShare);
  economy.defaultsThisTick = 0;
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
