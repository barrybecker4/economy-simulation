import { Rng } from '../rng/rng.js';
import { splitProportional } from './allocate.js';
import { capitalizeBanks } from './bookkeeping.js';
import type { Economy } from './economy.js';
import { redistributeToUnemployed } from './income.js';
import { employ, firmCapacity, pay, priceTrend } from './helpers.js';
import type { Parameters } from './parameters.js';
import { INITIAL_WAGE, INVENTORY_MONTHS, NATURAL_UNEMPLOYMENT } from './rules.js';
import { clamp, mean } from './stats.js';
import type { ForcedShock } from './types.js';

export function createEconomy(
  params: Parameters,
  seed: number,
  forcedShock: ForcedShock | null,
): Economy {
  const root = new Rng(seed);
  const shockRng = root.fork('shocks');
  const wageLevel = INITIAL_WAGE;
  const priceLevel = INITIAL_WAGE * (1 + params.markup);
  const policyRate = params.timePrefMean + params.inflationTarget;

  const economy: Economy = {
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
    ledger: null,
    ready: false,
    aiFactor: 1,
    automatedShare: params.autoStart,
    agentVolume: 0,
    agentGoodsSpend: 0,
    wageBill: 0,
    taxRevenue: 0,
    agentTaxRevenue: 0,
    ubiOutlay: 0,
    wageLevel,
    priceLevel,
    productivity: 1,
    demandImpulse: 0,
    productivityImpulse: 0,
    creditImpulse: 0,
    policyRate,
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
  };

  const monthlyInflation = priceTrend(economy);
  for (let age = 12; age >= 1; age -= 1) {
    economy.priceHistory.push(priceLevel / (1 + monthlyInflation) ** age);
  }

  const init = root.fork('init');
  for (let id = 0; id < params.bankCount; id += 1) {
    economy.banks.push({
      id,
      vault: 0,
      equity: 0,
      reserves: 0,
      bonds: 0,
      failed: false,
    });
  }
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
      salesUnits: 0,
      output: 0,
      investment: 0,
      negTicks: 0,
    });
  }
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
    });
  }

  const meanSkill = mean(economy.households.map((household) => household.skill));
  if (!Number.isFinite(meanSkill) || meanSkill <= 0) {
    throw new Error('Mean household skill must be positive');
  }
  for (const household of economy.households) {
    household.skill /= meanSkill;
  }

  employ(economy, Math.round(params.householdCount * (1 - NATURAL_UNEMPLOYMENT)));
  let initialOutput = 0;
  for (const firm of economy.firms) {
    firm.capital = Math.max(1, firm.workers.length);
    firm.inventory = firmCapacity(economy, firm) * INVENTORY_MONTHS;
    firm.loan = Math.round(0.5 * firm.capital * firm.price);
    initialOutput += firmCapacity(economy, firm);
  }
  for (const household of economy.households) {
    household.deposit = Math.round(household.skill ** 2 * INITIAL_WAGE * 36);
    household.income = 0;
  }
  for (const firm of economy.firms) {
    const revenue = Math.max(0, Math.round(firm.price * firmCapacity(economy, firm)));
    const pays = firm.workers.flatMap((workerId) => {
      const worker = economy.households[workerId];
      return worker ? [{ id: workerId, amount: pay(worker, firm) }] : [];
    });
    const weights = pays.map((item) => item.amount);
    const parts = splitProportional(revenue, weights);
    for (let index = 0; index < pays.length; index += 1) {
      const item = pays[index];
      const share = parts[index] ?? 0;
      const worker = item ? economy.households[item.id] : undefined;
      if (worker) {
        worker.income += share;
        worker.deposit += share;
      }
    }
  }
  redistributeToUnemployed(economy);
  for (const household of economy.households) {
    household.smoothed = household.income;
  }
  for (let index = 0; index < economy.gdpHistory.length; index += 1) {
    economy.gdpHistory[index] = Math.max(initialOutput, 1);
  }
  capitalizeBanks(economy);
  return economy;
}
