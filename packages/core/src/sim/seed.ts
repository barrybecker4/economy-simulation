import type { Rng } from '../rng/rng.js';
import { splitProportional } from './allocate.js';
import { firmCapacity } from './capacity.js';
import type { Economy } from './economy.js';
import { pay } from './helpers.js';
import { creditDeposit, setDeposit, setFirmLoan } from './money.js';
import type { Parameters } from './parameters.js';
import { INITIAL_WAGE, INVENTORY_MONTHS } from './rules.js';
import { clamp, mean } from './stats.js';
import type { Firm, ForcedShock } from './types.js';

/** Three years of the base wage, scaled by skill squared. */
const OPENING_DEPOSIT_MONTHS = 36;
const OPENING_LOAN_SHARE = 0.5;

export function blankEconomy(
  params: Parameters,
  shockRng: Rng,
  forcedShock: ForcedShock | null,
): Economy {
  const wageLevel = INITIAL_WAGE;
  const priceLevel = INITIAL_WAGE * (1 + params.markup);
  return {
    params,
    households: [],
    firms: [],
    banks: [],
    agents: [],
    shockRng,
    priceHistory: [],
    gdpHistory: Array.from({ length: 12 }, () => 1),
    creditHistory: [],
    forcedShock,
    shock: null,
    ready: false,
    aiFactor: 1,
    displacementFactor: 1,
    automatedShare: params.autoStart,
    adoptionProgress: 0,
    agentVolume: 0,
    agentGoodsSpend: 0,
    agentFees: 0,
    agentSweep: 0,
    wageBill: 0,
    profitPaid: 0,
    govGoodsSpend: 0,
    interestPaid: 0,
    newBorrowing: 0,
    loanRepaid: 0,
    taxRevenue: 0,
    agentTaxRevenue: 0,
    ubiOutlay: 0,
    wageLevel,
    priceLevel,
    productivity: 1,
    demandImpulse: 0,
    productivityImpulse: 0,
    creditImpulse: 0,
    policyRate: params.timePrefMean + params.inflationTarget,
    realGdp: 0,
    consumptionSpend: 0,
    investmentSpend: 0,
    realInvestment: 0,
    defaultsThisTick: 0,
    cumulativeFailures: 0,
    boomLength: 0,
    bustLength: 0,
    sawBoom: false,
    privateEquity: 0,
    govDeposits: 0,
    tick: 0,
    demandBase: 0,
    desiredSpend: 0,
    depositRate: 0,
    tenureChanges: 0,
    newConsumerBorrowing: 0,
    loanFinance: 0,
    profitSharingFinance: 0,
    fiscalBoost: 0,
    transitionDone: false,
  };
}

export function seedPriceHistory(economy: Economy, monthlyInflation: number): void {
  for (let age = 12; age >= 1; age -= 1) {
    economy.priceHistory.push(economy.priceLevel / (1 + monthlyInflation) ** age);
  }
}

/** Banks, firms, then households. `init` draws are taken before each household's search stream. */
export function seedActors(economy: Economy, init: Rng, root: Rng): void {
  seedBanks(economy);
  seedFirms(economy, init);
  seedHouseholds(economy, init, root);
}

export function normalizeSkills(economy: Economy): void {
  const meanSkill = mean(economy.households.map((household) => household.skill));
  if (!Number.isFinite(meanSkill) || meanSkill <= 0) {
    throw new Error('Mean household skill must be positive');
  }
  for (const household of economy.households) {
    household.skill /= meanSkill;
  }
}

export function openFirmBooks(economy: Economy): number {
  let initialOutput = 0;
  for (const firm of economy.firms) {
    firm.capital = Math.max(1, firm.workers.length);
    firm.inventory = firmCapacity(economy, firm) * INVENTORY_MONTHS;
    setFirmLoan(firm, Math.round(OPENING_LOAN_SHARE * firm.capital * firm.price));
    initialOutput += firmCapacity(economy, firm);
  }
  return initialOutput;
}

export function seedHouseholdCash(economy: Economy): void {
  for (const household of economy.households) {
    setDeposit(household, Math.round(household.skill ** 2 * INITIAL_WAGE * OPENING_DEPOSIT_MONTHS));
    household.income = 0;
  }
}

export function seedFirmPayroll(economy: Economy): void {
  for (const firm of economy.firms) {
    payOpeningWages(economy, firm);
  }
}

function seedBanks(economy: Economy): void {
  for (let id = 0; id < economy.params.bankCount; id += 1) {
    economy.banks.push({
      id,
      vault: 0,
      equity: 0,
      reserves: 0,
      bonds: 0,
      failed: false,
    });
  }
}

function seedFirms(economy: Economy, init: Rng): void {
  const { params, priceLevel, wageLevel } = economy;
  for (let id = 0; id < params.firmCount; id += 1) {
    economy.firms.push({
      id,
      bank: id % params.bankCount,
      productivity: clamp(init.lognormal(0, 0.05), 0.8, 1.25),
      capital: 0,
      price: priceLevel,
      inventory: 0,
      wage: wageLevel,
      workers: [],
      deposit: 0,
      loan: 0,
      output: 0,
      negTicks: 0,
    });
  }
}

function seedHouseholds(economy: Economy, init: Rng, root: Rng): void {
  const { params } = economy;
  for (let id = 0; id < params.householdCount; id += 1) {
    economy.households.push({
      id,
      bank: id % params.bankCount,
      skill: clamp(init.lognormal(0, params.skillSigma), 0.2, 5),
      timePref: clamp(init.normal(params.timePrefMean, params.prefStd), 0.01, 0.15),
      deposit: 0,
      employer: -1,
      income: 0,
      consumption: 0,
      realConsumption: 0,
      smoothed: 0,
      search: root.fork('hh').fork(id),
      tenure: 'none',
      mortgage: 0,
      mortgagePayment: 0,
      consumerLoan: 0,
    });
  }
}

function payOpeningWages(economy: Economy, firm: Firm): void {
  const revenue = Math.max(0, Math.round(firm.price * firmCapacity(economy, firm)));
  const pays = firm.workers.flatMap((workerId) => {
    const worker = economy.households[workerId];
    return worker ? [{ id: workerId, amount: pay(worker, firm) }] : [];
  });
  const parts = splitProportional(
    revenue,
    pays.map((item) => item.amount),
  );
  for (let index = 0; index < pays.length; index += 1) {
    const item = pays[index];
    const share = parts[index] ?? 0;
    const worker = item ? economy.households[item.id] : undefined;
    if (worker) {
      worker.income += share;
      creditDeposit(worker, share);
    }
  }
}
