import type { Rng } from '../rng/rng.js';

export type Tenure = 'rent' | 'mortgage' | 'owned' | 'none';

export interface Household {
  id: number;
  bank: number;
  skill: number;
  timePref: number;
  deposit: number;
  /** Bitcoin units. The bank liability is these units times the bitcoin price. */
  bitcoin: number;
  employer: number;
  income: number;
  consumption: number;
  realConsumption: number;
  smoothed: number;
  search: Rng;
  tenure: Tenure;
  mortgage: number;
  /** Mortgage principal denominated in bitcoin units. */
  bitcoinMortgage: number;
  mortgagePayment: number;
  /** True when the rebase stamped this mortgage as a real claim. */
  mortgageIndexed: boolean;
  /** Months the household has missed a full mortgage payment. */
  mortgageArrears: number;
  consumerLoan: number;
  /** Consumer principal denominated in bitcoin units. */
  bitcoinConsumer: number;
}

export interface Firm {
  id: number;
  bank: number;
  productivity: number;
  capital: number;
  price: number;
  inventory: number;
  wage: number;
  workers: number[];
  deposit: number;
  /** Bitcoin units. The bank liability is these units times the bitcoin price. */
  bitcoin: number;
  loan: number;
  /** Firm loan principal denominated in bitcoin units. */
  bitcoinLoan: number;
  output: number;
  /** Agent compute units bought last month. They raise capacity when compute productivity is positive. */
  computeReady: number;
  /** Units sold since the last labor step, including government purchases. */
  sales: number;
  /** Smoothed unit sales used when demand sets output or firms set hiring. */
  expectedSales: number;
  negTicks: number;
}

export interface Agent {
  id: number;
  owner: number;
  deposit: number;
  /** Bitcoin units. The bank liability is these units times the bitcoin price. */
  bitcoin: number;
  income: number;
  smoothed: number;
}

export interface Bank {
  id: number;
  vault: number;
  equity: number;
  reserves: number;
  bonds: number;
  /** Whole cents above `bonds` once that balance no longer fits in a safe integer. */
  bondsOver: bigint;
  failed: boolean;
}

export type ShockKind = 'credit' | 'demand' | 'productivity';

export interface ActiveShock {
  kind: ShockKind;
  size: number;
  month: number;
}

export interface ForcedShock {
  tick: number;
  kind: ShockKind;
  size: number;
}
