import type { BasketSplit } from './basket.js';

export interface DistributionReading {
  gini: number;
  mean: number;
  median: number;
  topDecile: number;
  bottomQuintile: number;
  quintiles: [number, number, number, number, number];
}

export interface TenureReading {
  mortgageCount: number;
  rentCount: number;
  ownedCount: number;
  tenureChanges: number;
  consumerCredit: number;
  medianDebtService: number;
  newConsumerBorrowing: number;
}

export interface JobReading {
  unemployed: number;
  small: number;
  large: number;
}

/** Numbers the welfare phase has already measured, plus the flows those measures do not own. */
export interface MetricSnapshot {
  realGdp: number;
  growth: number;
  employed: number;
  householdCount: number;
  agentCount: number;
  priceLevel: number;
  categories: BasketSplit;
  housingSecurity: number;
  inflation: number;
  interestRate: number;
  deflationSensitivity: number;
  deposits: number;
  reserves: number;
  loans: number;
  savings: number;
  tick: number;
  prodGrowth: number;
  housingSupplyGrowth: number;
  tenureChoice: 'off' | 'on';
  tenure: TenureReading | null;
  investmentHurdle: 'off' | 'on';
  loanFinance: number;
  profitSharingFinance: number;
  consumptionSpend: number;
  investmentSpend: number;
  agentGoodsSpend: number;
  govGoodsSpend: number;
  agentVolume: number;
  agentFees: number;
  agentSweep: number;
  interestPaid: number;
  newBorrowing: number;
  loanRepaid: number;
  taxRevenue: number;
  agentTaxRevenue: number;
  ubiOutlay: number;
  wageBill: number;
  profitPaid: number;
  wageLevel: number;
  demandImpulse: number;
  creditImpulse: number;
  productivityImpulse: number;
  realInvestment: number;
  defaultsThisTick: number;
  cumulativeFailures: number;
  boomLength: number;
  bustLength: number;
  nominalOutput: number;
  income: DistributionReading;
  wealth: DistributionReading;
  skill: DistributionReading;
  consumption: DistributionReading;
  wellbeingMean: number;
  wellbeingMedian: number;
  consumptionFloorShare: number;
  jobs: JobReading;
  ownerWealthShare: number;
  aiShareOfWealth: number;
  aiFactor: number;
  automatedShare: number;
  naturalUnemployment: number;
}
