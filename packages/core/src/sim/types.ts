import type { Rng } from '../rng/rng.js';

export type Tenure = 'rent' | 'mortgage' | 'owned' | 'none';

export interface Household {
  id: number;
  bank: number;
  skill: number;
  timePref: number;
  deposit: number;
  employer: number;
  income: number;
  consumption: number;
  realConsumption: number;
  smoothed: number;
  search: Rng;
  tenure: Tenure;
  mortgage: number;
  mortgagePayment: number;
  /** Months the household has missed a full mortgage payment. */
  mortgageArrears: number;
  consumerLoan: number;
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
  loan: number;
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
  income: number;
  smoothed: number;
}

export interface Bank {
  id: number;
  vault: number;
  equity: number;
  reserves: number;
  bonds: number;
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
