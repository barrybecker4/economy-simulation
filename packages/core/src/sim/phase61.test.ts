import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { TickContext } from '../engine/engine.js';
import { Ledger } from '../ledger/ledger.js';
import { MetricsRecorder, type MetricsTable } from '../metrics/metrics.js';
import { moneyBalances, totalLoans } from './banking.js';
import { onBookkeeping } from './bookkeeping.js';
import { onCentralBank } from './central-bank.js';
import { onContractChoice } from './contracts.js';
import { onCredit } from './credit.js';
import type { Economy } from './economy.js';
import { onGoods } from './goods.js';
import { onGovernment } from './government.js';
import { createEconomy } from './init.js';
import { onLabor } from './labor.js';
import { loadParameters } from './parameters.js';
import { onPopulation } from './population.js';
import { onProduction } from './production.js';
import { onShocks } from './shocks.js';
import { onTransition } from './transition.js';
import { onWelfare } from './welfare.js';

const calm = {
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
  'housing.tenureChoice': 'on',
  'transition.lengthMonths': 12,
  'transition.gradualWeight': 1,
};

describe('phase 61 dual-currency transition', () => {
  it('keeps both fiat and bitcoin balances in the middle of a 12-month window', () => {
    const { economy } = runTicks({ ...calm, 'transition.debtHaircut': 0 }, 6);
    const balances = moneyBalances(economy);
    const total = balances.fiat + balances.bitcoin;
    expect(balances.fiat).toBeGreaterThan(0);
    expect(balances.bitcoin).toBeGreaterThan(0);
    expect(balances.fiat / total).toBeGreaterThan(0.05);
    expect(balances.bitcoin / total).toBeGreaterThan(0.05);
    expect(economy.params.regime).toBe('fiat');
  });

  it('pays for goods from either balance', () => {
    const economy = open({ ...calm, 'transition.lengthMonths': 0, 'housing.tenureChoice': 'off' });
    for (const household of economy.households) {
      household.deposit = 0;
      household.bitcoin = 0;
      household.smoothed = 0;
      household.income = 0;
      household.mortgagePayment = 0;
      household.consumerLoan = 0;
    }
    const fiatBuyer = economy.households[0];
    const coinBuyer = economy.households[1];
    if (!fiatBuyer || !coinBuyer) {
      throw new Error('Need two households');
    }
    fiatBuyer.deposit = 500;
    fiatBuyer.smoothed = 200;
    coinBuyer.bitcoin = 500;
    coinBuyer.smoothed = 200;
    economy.bitcoinCarried = 500;
    for (const firm of economy.firms) {
      firm.inventory = 100;
      firm.price = 1;
    }
    onGoods(economy);
    expect(fiatBuyer.consumption).toBeGreaterThan(0);
    expect(fiatBuyer.deposit).toBeLessThan(500);
    expect(coinBuyer.consumption).toBeGreaterThan(0);
    expect(coinBuyer.bitcoin).toBeLessThan(500);
    expect(economy.firms.some((firm) => firm.deposit > 0)).toBe(true);
  });

  it('moves credit by more than 2 points when the debt haircut is 0.3', () => {
    const plain = runTicks({ ...calm, 'transition.debtHaircut': 0 }, 6);
    const cut = runTicks({ ...calm, 'transition.debtHaircut': 0.3 }, 6);
    const plainCredit = creditAt(plain.metrics, 5);
    const cutCredit = creditAt(cut.metrics, 5);
    expect(Math.abs(plainCredit - cutCredit)).toBeGreaterThan(0.02);
    expect(totalLoans(cut.economy)).toBeLessThan(totalLoans(plain.economy) * 0.98);
  });

  it('keeps the ledger closed on each conversion tick', () => {
    expect(() => runTicks({ ...calm, 'transition.debtHaircut': 0.3 }, 12)).not.toThrow();
  });

  it('leaves the one-step rebase in place when gradual weight is 0', () => {
    const economy = open({
      ...calm,
      'transition.gradualWeight': 0,
      'transition.debtHaircut': 0.3,
    });
    const loans = totalLoans(economy);
    economy.tick = 3;
    onTransition(economy);
    expect(moneyBalances(economy).bitcoin).toBe(0);
    expect(economy.params.regime).toBe('fiat');
    expect(totalLoans(economy)).toBe(loans);
    economy.tick = 11;
    onTransition(economy);
    expect(economy.params.regime).toBe('bitcoin');
    expect(moneyBalances(economy).bitcoin).toBe(0);
    expect(totalLoans(economy)).toBeLessThan(loans);
  });

  it('converts the monthly slice into bitcoin units at the current price', () => {
    const economy = open({ ...calm, 'transition.debtHaircut': 0, 'housing.tenureChoice': 'off' });
    economy.bitcoinPrice = 2;
    const before = moneyBalances(economy).fiat;
    onTransition(economy);
    const balances = moneyBalances(economy);
    expect(balances.fiat + balances.bitcoin).toBeCloseTo(before, 6);
    expect(unitCount(economy) * 2).toBeCloseTo(before / 12, 4);
    expect(balances.bitcoin).toBeGreaterThan(0);
    expect(balances.fiat).toBeGreaterThan(0);
  });
});

function creditAt(metrics: MetricsTable, index: number): number {
  const value = metrics.series.creditToGdp[index];
  if (value === null || value === undefined) {
    throw new Error('Missing credit');
  }
  return value;
}

function unitCount(economy: Economy): number {
  let total = economy.govBitcoin;
  for (const household of economy.households) {
    total += household.bitcoin;
  }
  for (const firm of economy.firms) {
    total += firm.bitcoin;
  }
  for (const agent of economy.agents) {
    total += agent.bitcoin;
  }
  return total;
}

function open(sliders: Record<string, number | string>): Economy {
  const config = loadScenario({ name: 'phase61', seed: 4, ticks: 1, sliders });
  return createEconomy(loadParameters(config), config.seed, null);
}

function runTicks(
  sliders: Record<string, number | string>,
  ticks: number,
): { economy: Economy; metrics: MetricsTable } {
  const config = loadScenario({ name: 'phase61-run', seed: 4, ticks, sliders });
  const economy = createEconomy(loadParameters(config), config.seed, null);
  const ledger = new Ledger(economy.params.unit);
  const recorder = new MetricsRecorder();
  for (let tick = 0; tick < ticks; tick += 1) {
    const ctx: TickContext = {
      tick,
      config,
      rng: economy.shockRng,
      ledger,
      metrics: recorder,
      audit: null,
    };
    onShocks(economy, ctx);
    onPopulation(economy);
    onLabor(economy);
    onProduction(economy);
    onGoods(economy);
    onContractChoice(economy);
    onCredit(economy);
    onGovernment(economy);
    onTransition(economy);
    onCentralBank(economy);
    onBookkeeping(economy, ctx);
    onWelfare(economy, ctx);
    recorder.commitTick(tick);
  }
  expect(ledger.audit().ok).toBe(true);
  return { economy, metrics: recorder.snapshot() };
}
