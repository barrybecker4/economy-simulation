import type { TickContext } from '../engine/engine.js';
import { assembleMetrics, type MetricSnapshot, type TenureReading } from './assemble-metrics.js';
import { savingsStock, totalDeposits, totalLoans } from './banking.js';
import { aiShareOfWealth, jobShares, measureHouseholds, ownerWealthShare } from './census.js';
import type { Economy } from './economy.js';
import { growth, inflation, naturalUnemployment } from './helpers.js';
import { CONSUMER_LOAN_REPAY } from './rules.js';
import { median } from './stats.js';
import type { Household } from './types.js';

export function onWelfare(economy: Economy, ctx: TickContext): void {
  assembleMetrics(metricSnapshot(economy), ctx.metrics);
  economy.defaultsThisTick = 0;
}

function metricSnapshot(economy: Economy): MetricSnapshot {
  const measured = measureHouseholds(economy);
  return {
    ...levels(economy, measured),
    ...flows(economy),
    income: measured.income,
    wealth: measured.wealth,
    skill: measured.skill,
    consumption: measured.consumption,
    wellbeingMean: measured.wellbeingMean,
    wellbeingMedian: measured.wellbeingMedian,
    consumptionFloorShare: measured.consumptionFloorShare,
    jobs: jobShares(economy),
    ownerWealthShare: ownerWealthShare(economy),
    aiShareOfWealth: aiShareOfWealth(economy),
    aiFactor: economy.aiFactor,
    automatedShare: economy.automatedShare,
    naturalUnemployment: naturalUnemployment(economy),
  };
}

function levels(
  economy: Economy,
  measured: ReturnType<typeof measureHouseholds>,
): Pick<
  MetricSnapshot,
  | 'realGdp'
  | 'growth'
  | 'employed'
  | 'householdCount'
  | 'agentCount'
  | 'priceLevel'
  | 'categories'
  | 'housingSecurity'
  | 'inflation'
  | 'interestRate'
  | 'deflationSensitivity'
  | 'deposits'
  | 'reserves'
  | 'loans'
  | 'savings'
  | 'tick'
  | 'prodGrowth'
  | 'housingSupplyGrowth'
  | 'tenureChoice'
  | 'tenure'
  | 'investmentHurdle'
  | 'nominalOutput'
> {
  return {
    realGdp: economy.realGdp,
    growth: growth(economy),
    employed: measured.employed,
    householdCount: economy.households.length,
    agentCount: economy.agents.length,
    priceLevel: economy.priceLevel,
    categories: measured.categories,
    housingSecurity: measured.housingSecurity,
    inflation: inflation(economy),
    interestRate: economy.policyRate,
    deflationSensitivity: economy.params.deflationSensitivity,
    deposits: totalDeposits(economy),
    reserves: economy.banks.reduce((sum, bank) => sum + bank.reserves, 0),
    loans: totalLoans(economy),
    savings: savingsStock(economy),
    tick: economy.tick,
    prodGrowth: economy.params.prodGrowth,
    housingSupplyGrowth: economy.params.housingSupplyGrowth,
    tenureChoice: economy.params.tenureChoice,
    tenure: economy.params.tenureChoice === 'on' ? readTenure(economy) : null,
    investmentHurdle: economy.params.investmentHurdle,
    nominalOutput: economy.priceLevel * economy.realGdp,
  };
}

function flows(
  economy: Economy,
): Pick<
  MetricSnapshot,
  | 'loanFinance'
  | 'profitSharingFinance'
  | 'consumptionSpend'
  | 'investmentSpend'
  | 'agentGoodsSpend'
  | 'govGoodsSpend'
  | 'agentVolume'
  | 'agentFees'
  | 'agentSweep'
  | 'interestPaid'
  | 'newBorrowing'
  | 'loanRepaid'
  | 'taxRevenue'
  | 'agentTaxRevenue'
  | 'ubiOutlay'
  | 'wageBill'
  | 'profitPaid'
  | 'wageLevel'
  | 'demandImpulse'
  | 'creditImpulse'
  | 'productivityImpulse'
  | 'realInvestment'
  | 'defaultsThisTick'
  | 'cumulativeFailures'
  | 'boomLength'
  | 'bustLength'
> {
  return {
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
    debtService.push(debtServiceRatio(household));
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

function debtServiceRatio(household: Household): number {
  const service = household.mortgagePayment + household.consumerLoan * CONSUMER_LOAN_REPAY;
  return service / Math.max(household.income, 1);
}
