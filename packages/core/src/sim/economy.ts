import type { Rng } from '../rng/rng.js';
import type { DepositFlowBuckets } from './deposit-flows.js';
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
  /** Treasury bitcoin units. */
  govBitcoin: number;
  /** Ledger value of bitcoin deposit units at the last mark. */
  bitcoinCarried: number;
  /** Ledger value of bitcoin loan units at the last mark. */
  bitcoinLoanCarried: number;
  tick: number;
  demandBase: number;
  desiredSpend: number;
  depositRate: number;
  /** Annualized rate actually credited on household deposits last payment. */
  paidDepositRate: number;
  depositInterestPaid: number;
  /** Fiat interest on reserves credited this tick, already inside the money stock. */
  reserveInterestPaid: number;
  /** Signed fiat money-growth injection this tick after netting reserve interest. */
  fiatInjectionFlow: number;
  /** Firm deposits created this tick to meet the reserve requirement. */
  reserveAccommodationFlow: number;
  /** Per-tick deposit-flow buckets, appended at welfare. */
  readonly depositFlowHistory: DepositFlowBuckets[];
  /** Firm loans booked by the newLoans injection and not yet repaid. */
  channelLoans: number;
  /** Mortgage interest received this tick, by bank id, available to fund deposit interest. */
  mortgageInterest: Map<number, number>;
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
  /**
   * Past months of signed unemployment gap for lagged crisis stimulus.
   * Each entry is unemployment minus the natural rate for that fiat tick.
   */
  readonly contractionPressure: number[];
  /**
   * Remaining notional budget this tick for sparing insolvent firms from
   * replacement. Set from the crisis-stimulus slice of fiat money growth.
   */
  zombieBudget: number;
  transitionDone: boolean;
  /**
   * Price level when indexed mortgages were last marked. Zero means none are
   * stamped yet.
   */
  realMortgagePrice: number;
  /** Leverage and default pressure. Unused while endogenous credit weight is 0. */
  creditStress: number;
  /** Housing price pressure. One leaves the formula price unchanged. */
  housingPressure: number;
  /** Months unemployment has stayed more than five points above natural. */
  /** Fractional households waiting to enter or exit. */
  populationCredit: number;
  moneyShares: MoneyShares;
  bitcoinPrice: number;
  stablecoinPrice: number;
  cbdcPrice: number;
  /** Capital claims counted in wealth when the equity market is on. */
  equityClaims: number[];
}
