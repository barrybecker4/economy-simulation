import type { TickContext } from '../engine/engine.js';
import { BASKET_METRICS, splitBasket } from './basket.js';
import { bottomShare, clamp, gini, mean, median, topShare } from './stats.js';
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
  const realIncomes = economy.households.map(
    (household) => household.income / Math.max(economy.priceLevel, 1),
  );
  const typical = Math.max(median(realIncomes), 0.01);
  const securities = realIncomes.map((income) =>
    clamp(income / typical / (1 + relativeHousing), 0, 1),
  );
  const wellbeing = consumption.map(
    (value, index) =>
      Math.log(Math.max(value, 0.01)) + economy.params.housingWeight * (securities[index] ?? 0),
  );
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
  metrics.set('agentGoodsSpend', economy.agentGoodsSpend);
  metrics.set('giniWealth', gini(wealth));
  metrics.set('giniIncome', gini(incomes));
  metrics.set('giniSkill', gini(skills));
  metrics.set('giniConsumption', gini(consumption));
  metrics.set('realInvestment', economy.realInvestment);
  metrics.set('topDecileWealthShare', topShare(wealth, 0.1));
  metrics.set('bottomQuintileWealthShare', bottomShare(wealth, 0.2));
  metrics.set('meanRealWealth', economy.priceLevel > 0 ? mean(wealth) / economy.priceLevel : 0);
  metrics.set('medianRealWealth', economy.priceLevel > 0 ? median(wealth) / economy.priceLevel : 0);
  metrics.set('meanRealIncome', economy.priceLevel > 0 ? mean(incomes) / economy.priceLevel : 0);
  metrics.set(
    'medianRealIncome',
    economy.priceLevel > 0 ? median(incomes) / economy.priceLevel : 0,
  );
  metrics.set('meanRealConsumption', mean(consumption));
  metrics.set('medianRealConsumption', median(consumption));
  const floor = median(consumption) * 0.25;
  const below = consumption.filter((value) => value < floor).length / economy.households.length;
  metrics.set('consumptionFloorShare', below);
  metrics.set('meanWellbeing', mean(wellbeing));
  metrics.set('medianWellbeing', median(wellbeing));
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
