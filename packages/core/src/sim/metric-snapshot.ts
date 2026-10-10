import type { BasketSplit } from './basket.js';

export interface DistributionReading {
  gini: number;
  mean: number;
  median: number;
  topDecile: number;
  bottomQuintile: number;
  quintiles: [number, number, number, number, number];
  /** Sum of non-negative holdings; quintile share times this is that fifth's amount. */
  total: number;
}

export interface TenureReading {
  mortgageCount: number;
  rentCount: number;
  ownedCount: number;
  tenureChanges: number;
  mortgageOriginations: number;
  rentToMortgage: number;
  mortgageToOwned: number;
  mortgageToRent: number;
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
  /** Multiplier from internal fiat units to original cents. One when nothing has been redenominated. */
  nominalScale: number;
  categories: BasketSplit;
  housingSecurity: number;
  homePriceMonths: number;
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
  fiatShare: number;
  bitcoinShare: number;
  stablecoinShare: number;
  cbdcShare: number;
  bitcoinPrice: number;
  nominalOutput: number;
  income: DistributionReading;
  wealth: DistributionReading;
  /** Nominal sum of the cash part of non-negative household wealth. */
  cashWealthTotal: number;
  /** Nominal sum of the capital-claim part of non-negative household wealth. */
  claimWealthTotal: number;
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
