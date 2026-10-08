import type { Rng } from '../rng/rng.js';
import type { MoneyShares } from './monies.js';
import type { Parameters } from './parameters.js';
import type { ActiveShock, Agent, Bank, Firm, ForcedShock, Household } from './types.js';

/** Mutable economy stocks and flows shared across tick phases. */
export interface Economy {
  readonly params: Parameters;
  readonly households: Household[];
  readonly firms: Firm[];
  readonly banks: Bank[];
  readonly agents: Agent[];
  readonly shockRng: Rng;
  readonly populationRng: Rng;
  readonly priceHistory: number[];
  readonly gdpHistory: number[];
  readonly creditHistory: number[];
  forcedShock: ForcedShock | null;
  shock: ActiveShock | null;
  ready: boolean;
  aiFactor: number;
  displacementFactor: number;
  automatedShare: number;
  /** Adoption-curve progress in [0, 1]. Zero when the automatable share is flat. */
  adoptionProgress: number;
  agentVolume: number;
  agentGoodsSpend: number;
  agentFees: number;
  agentSweep: number;
  wageBill: number;
  profitPaid: number;
  govGoodsSpend: number;
  interestPaid: number;
  newBorrowing: number;
  loanRepaid: number;
  taxRevenue: number;
  agentTaxRevenue: number;
  ubiOutlay: number;
  wageLevel: number;
  priceLevel: number;
  productivity: number;
  demandImpulse: number;
  productivityImpulse: number;
  creditImpulse: number;
  policyRate: number;
  realGdp: number;
  consumptionSpend: number;
  investmentSpend: number;
  realInvestment: number;
  defaultsThisTick: number;
  cumulativeFailures: number;
  boomLength: number;
  bustLength: number;
  sawBoom: boolean;
  privateEquity: number;
  govDeposits: number;
  tick: number;
  demandBase: number;
  desiredSpend: number;
  depositRate: number;
  /** Annualized rate actually credited on household deposits last payment. */
  paidDepositRate: number;
  depositInterestPaid: number;
  /** Fiat interest on reserves credited this tick, already inside the money stock. */
  reserveInterestPaid: number;
  /** Hybrid lender-of-last-resort has already run this tick. */
  lenderOfLastResortRan: boolean;
  tenureChanges: number;
  rentToMortgage: number;
  mortgageToOwned: number;
  mortgageToRent: number;
  mortgageOriginations: number;
  newConsumerBorrowing: number;
  loanFinance: number;
  profitSharingFinance: number;
  fiscalBoost: number;
  transitionDone: boolean;
  /** Leverage and default pressure. Unused while endogenous credit weight is 0. */
  creditStress: number;
  /** Housing price pressure. One leaves the formula price unchanged. */
  housingPressure: number;
  /** Months unemployment has stayed more than five points above natural. */
  slackMonths: number;
  /** Fractional households waiting to enter or exit. */
  populationCredit: number;
  moneyShares: MoneyShares;
  bitcoinPrice: number;
  stablecoinPrice: number;
  cbdcPrice: number;
  /** Capital claims counted in wealth when the equity market is on. */
  equityClaims: number[];
}
