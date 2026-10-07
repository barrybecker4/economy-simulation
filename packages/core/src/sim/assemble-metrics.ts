import type { MetricId } from '../metrics/metrics.js';
import { BASKET_METRICS } from './basket.js';
import { deflationPenaltyFrom } from './helpers.js';
import type { MetricSnapshot } from './metric-snapshot.js';

export type {
  DistributionReading,
  JobReading,
  MetricSnapshot,
  TenureReading,
} from './metric-snapshot.js';

export interface MetricSink {
  set(id: MetricId, value: number): void;
}

export function assembleMetrics(snapshot: MetricSnapshot, metrics: MetricSink): void {
  const penalty = deflationPenaltyFrom(snapshot.deflationSensitivity, snapshot.inflation);
  recordOutput(snapshot, metrics);
  recordPrices(snapshot, metrics);
  recordMoney(snapshot, metrics);
  recordTenure(snapshot, metrics, penalty);
  recordProfitSharing(snapshot, metrics, penalty);
  recordFlows(snapshot, metrics);
  recordDistributions(snapshot, metrics);
  recordPopulation(snapshot, metrics);
}

function recordOutput(snapshot: MetricSnapshot, metrics: MetricSink): void {
  metrics.set('realGdp', snapshot.realGdp);
  metrics.set('growth', snapshot.growth);
  metrics.set(
    'productivityPerHuman',
    snapshot.employed > 0 ? snapshot.realGdp / snapshot.employed : 0,
  );
  metrics.set('realInvestment', snapshot.realInvestment);
  metrics.set('realWage', snapshot.priceLevel > 0 ? snapshot.wageLevel / snapshot.priceLevel : 0);
  metrics.set(
    'laborShare',
    snapshot.nominalOutput > 0 ? snapshot.wageBill / snapshot.nominalOutput : 0,
  );
  const earned = snapshot.wageBill + snapshot.profitPaid;
  metrics.set('capitalShare', earned > 0 ? snapshot.profitPaid / earned : 0);
  metrics.set('unemployment', 1 - snapshot.employed / snapshot.householdCount);
  metrics.set('naturalUnemployment', snapshot.naturalUnemployment);
}

function recordPrices(snapshot: MetricSnapshot, metrics: MetricSink): void {
  metrics.set('priceLevel', snapshot.priceLevel);
  metrics.set('priceGeneral', snapshot.categories.priceGeneral);
  for (const id of BASKET_METRICS) {
    metrics.set(id, snapshot.categories[id]);
  }
  metrics.set('housingSecurity', snapshot.housingSecurity);
  metrics.set('inflation', snapshot.inflation);
  metrics.set('interestRate', snapshot.interestRate);
}

function recordMoney(snapshot: MetricSnapshot, metrics: MetricSink): void {
  metrics.set('moneySupply', snapshot.deposits);
  metrics.set('baseMoney', snapshot.reserves);
  metrics.set('loanToSavings', snapshot.savings > 0 ? snapshot.loans / snapshot.savings : 0);
  metrics.set(
    'velocity',
    snapshot.deposits > 0
      ? (snapshot.consumptionSpend + snapshot.investmentSpend) / snapshot.deposits
      : 0,
  );
  metrics.set(
    'creditToGdp',
    snapshot.nominalOutput > 0 ? snapshot.loans / (snapshot.nominalOutput * 12) : 0,
  );
  metrics.set('fiatShare', snapshot.fiatShare);
  metrics.set('bitcoinShare', snapshot.bitcoinShare);
  metrics.set('stablecoinShare', snapshot.stablecoinShare);
  metrics.set('cbdcShare', snapshot.cbdcShare);
  metrics.set('bitcoinPrice', snapshot.bitcoinPrice);
}

function recordTenure(snapshot: MetricSnapshot, metrics: MetricSink, penalty: number): void {
  const tenure = snapshot.tenure;
  if (snapshot.tenureChoice === 'on' && tenure !== null) {
    const count = Math.max(1, snapshot.householdCount);
    metrics.set('nonMortgageHousingShare', 1 - tenure.mortgageCount / count);
    metrics.set('propertyTurnover', tenure.tenureChanges / count);
    metrics.set('mortgageShare', tenure.mortgageCount / count);
    metrics.set('rentShare', tenure.rentCount / count);
    metrics.set('ownedShare', tenure.ownedCount / count);
    metrics.set(
      'consumerCreditToGdp',
      snapshot.nominalOutput > 0 ? tenure.consumerCredit / (snapshot.nominalOutput * 12) : 0,
    );
    metrics.set('newConsumerBorrowing', tenure.newConsumerBorrowing);
    metrics.set('medianDebtService', tenure.medianDebtService);
    return;
  }
  metrics.set('nonMortgageHousingShare', 0.25 + 0.6 * penalty);
  const years = snapshot.tick / 12;
  const scarcity = (1 + snapshot.prodGrowth) ** years / (1 + snapshot.housingSupplyGrowth) ** years;
  metrics.set('propertyTurnover', (0.08 * (1 - penalty)) / Math.max(scarcity, 0.25));
  metrics.set('mortgageShare', 0);
  metrics.set('rentShare', 0);
  metrics.set('ownedShare', 0);
  metrics.set('consumerCreditToGdp', 0);
  metrics.set('newConsumerBorrowing', 0);
  metrics.set('medianDebtService', 0);
}

function recordProfitSharing(snapshot: MetricSnapshot, metrics: MetricSink, penalty: number): void {
  if (snapshot.investmentHurdle === 'on') {
    const financed = snapshot.loanFinance + snapshot.profitSharingFinance;
    metrics.set(
      'profitSharingShare',
      financed > 0 ? snapshot.profitSharingFinance / financed : 0.15 + 0.7 * penalty,
    );
    return;
  }
  metrics.set('profitSharingShare', 0.15 + 0.7 * penalty);
}

function recordFlows(snapshot: MetricSnapshot, metrics: MetricSink): void {
  metrics.set('taxRevenue', snapshot.taxRevenue);
  metrics.set('agentTaxRevenue', snapshot.agentTaxRevenue);
  metrics.set('ubiOutlay', snapshot.ubiOutlay);
  metrics.set('wageBill', snapshot.wageBill);
  metrics.set('profitPaid', snapshot.profitPaid);
  metrics.set(
    'householdGoodsSpend',
    Math.max(0, snapshot.consumptionSpend - snapshot.agentGoodsSpend),
  );
  metrics.set('govGoodsSpend', snapshot.govGoodsSpend);
  metrics.set('agentGoodsSpend', snapshot.agentGoodsSpend);
  metrics.set('agentVolume', snapshot.agentVolume);
  metrics.set('agentFees', snapshot.agentFees);
  metrics.set('agentSweep', snapshot.agentSweep);
  metrics.set('interestPaid', snapshot.interestPaid);
  metrics.set('newBorrowing', snapshot.newBorrowing);
  metrics.set('loanRepaid', snapshot.loanRepaid);
  metrics.set('demandImpulse', snapshot.demandImpulse);
  metrics.set('creditImpulse', snapshot.creditImpulse);
  metrics.set('productivityImpulse', snapshot.productivityImpulse);
  metrics.set('defaults', snapshot.defaultsThisTick);
  metrics.set('bankFailures', snapshot.cumulativeFailures);
  metrics.set('boomLength', snapshot.boomLength);
  metrics.set('bustLength', snapshot.bustLength);
}

function recordDistributions(snapshot: MetricSnapshot, metrics: MetricSink): void {
  const price = snapshot.priceLevel;
  metrics.set('giniWealth', snapshot.wealth.gini);
  metrics.set('giniIncome', snapshot.income.gini);
  metrics.set('giniSkill', snapshot.skill.gini);
  metrics.set('giniConsumption', snapshot.consumption.gini);
  metrics.set('topDecileWealthShare', snapshot.wealth.topDecile);
  metrics.set('bottomQuintileWealthShare', snapshot.wealth.bottomQuintile);
  metrics.set('wealthQuintile1', snapshot.wealth.quintiles[0]);
  metrics.set('wealthQuintile2', snapshot.wealth.quintiles[1]);
  metrics.set('wealthQuintile3', snapshot.wealth.quintiles[2]);
  metrics.set('wealthQuintile4', snapshot.wealth.quintiles[3]);
  metrics.set('wealthQuintile5', snapshot.wealth.quintiles[4]);
  metrics.set('meanRealWealth', price > 0 ? snapshot.wealth.mean / price : 0);
  metrics.set('medianRealWealth', price > 0 ? snapshot.wealth.median / price : 0);
  metrics.set('totalRealWealth', price > 0 ? snapshot.wealth.total / price : 0);
  metrics.set('meanRealIncome', price > 0 ? snapshot.income.mean / price : 0);
  metrics.set('medianRealIncome', price > 0 ? snapshot.income.median / price : 0);
  metrics.set('meanRealConsumption', snapshot.consumption.mean);
  metrics.set('medianRealConsumption', snapshot.consumption.median);
  metrics.set('consumptionFloorShare', snapshot.consumptionFloorShare);
  metrics.set('meanWellbeing', snapshot.wellbeingMean);
  metrics.set('medianWellbeing', snapshot.wellbeingMedian);
}

function recordPopulation(snapshot: MetricSnapshot, metrics: MetricSink): void {
  const population = snapshot.householdCount + snapshot.agentCount;
  const activity = snapshot.consumptionSpend + snapshot.agentVolume;
  const agentActivity = snapshot.agentVolume + snapshot.agentGoodsSpend;
  metrics.set('jobUnemployedShare', snapshot.jobs.unemployed);
  metrics.set('jobSmallFirmShare', snapshot.jobs.small);
  metrics.set('jobLargeFirmShare', snapshot.jobs.large);
  metrics.set('ownerWealthShare', snapshot.ownerWealthShare);
  metrics.set('aiShareOfAgents', population > 0 ? snapshot.agentCount / population : 0);
  metrics.set('aiShareOfWealth', snapshot.aiShareOfWealth);
  metrics.set('aiShareOfTransactions', activity > 0 ? agentActivity / activity : 0);
  metrics.set('aiShareOfOutput', snapshot.aiFactor > 1 ? 1 - 1 / snapshot.aiFactor : 0);
  metrics.set('tasksAutomated', snapshot.automatedShare);
}
