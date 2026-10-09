import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { TickContext } from '../engine/engine.js';
import type { SimulationResult } from '../engine/engine.js';
import { Ledger } from '../ledger/ledger.js';
import type { MetricId } from '../metrics/metrics.js';
import { MetricsRecorder } from '../metrics/metrics.js';
import { firmEquity, onBookkeeping } from './bookkeeping.js';
import { onCentralBank } from './central-bank.js';
import type { Economy } from './economy.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { FAILURE_TICKS } from './rules.js';
import { simulate, type ForcedShock } from './simulate.js';
import { ensureOpen } from './stocks.js';
import type { Firm } from './types.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

const contraction: ForcedShock = { tick: 12, kind: 'demand', size: -0.25 };

describe('phase 67 zombie support in a crisis', () => {
  it('leaves money and replacements unchanged at support 0 on a forced contraction', () => {
    const shared = {
      ...small,
      'regime.type': 'fiat' as const,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      'centralBank.stimulus': 1,
      'centralBank.stimulusLag': 6,
      ticks: 36,
    };
    const off = run({ ...shared, 'centralBank.zombieSupport': 0 }, contraction);
    const defaulted = run(shared, contraction);
    expect(off.audit.ok && defaulted.audit.ok).toBe(true);
    expect(series(off, 'moneySupply')).toEqual(series(defaulted, 'moneySupply'));
    expect(series(off, 'defaults')).toEqual(series(defaulted, 'defaults'));
  });

  it('keeps the same money path when support is on, because the budget is not a cash transfer', () => {
    const shared = {
      ...small,
      'regime.type': 'fiat' as const,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      'centralBank.stimulus': 1,
      'centralBank.stimulusLag': 6,
      ticks: 36,
    };
    const off = run({ ...shared, 'centralBank.zombieSupport': 0 }, contraction);
    const on = run({ ...shared, 'centralBank.zombieSupport': 1 }, contraction);
    expect(off.audit.ok && on.audit.ok).toBe(true);
    expect(series(off, 'moneySupply')).toEqual(series(on, 'moneySupply'));
  });

  it('replaces a firm after six negative months when support is 0', () => {
    const { economy, firm } = insolventFirm({ 'centralBank.zombieSupport': 0 });
    const loan = firm.loan;
    const workers = [...firm.workers];
    const capital = firm.capital;
    firm.negTicks = FAILURE_TICKS - 1;
    economy.zombieBudget = 0;
    bookkeep(economy);
    expect(firm.loan).toBe(0);
    expect(firm.workers).toEqual(workers);
    expect(firm.capital).toBe(1);
    expect(firm.negTicks).toBe(0);
    expect(loan).toBeGreaterThan(0);
    expect(workers.length + capital).toBeGreaterThan(0);
  });

  it('spares a firm when the budget covers the shortfall', () => {
    const { economy, firm } = insolventFirm({ 'centralBank.zombieSupport': 1 });
    const loan = firm.loan;
    const workers = [...firm.workers];
    const capital = firm.capital;
    const shortfall = -firmEquity(economy, firm);
    expect(shortfall).toBeGreaterThan(0);
    firm.negTicks = FAILURE_TICKS - 1;
    economy.zombieBudget = shortfall;
    bookkeep(economy);
    expect(firm.loan).toBe(loan);
    expect(firm.workers).toEqual(workers);
    expect(firm.capital).toBe(capital);
    expect(firm.negTicks).toBe(FAILURE_TICKS);
    expect(economy.zombieBudget).toBe(0);
  });

  it('still replaces the first firm when the budget is smaller than its shortfall', () => {
    const { economy, firm } = insolventFirm({ 'centralBank.zombieSupport': 1 });
    const workers = [...firm.workers];
    const shortfall = -firmEquity(economy, firm);
    firm.negTicks = FAILURE_TICKS - 1;
    economy.zombieBudget = Math.max(1, Math.floor(shortfall / 2));
    bookkeep(economy);
    expect(firm.loan).toBe(0);
    expect(firm.workers).toEqual(workers);
    expect(firm.capital).toBe(1);
  });

  it('replaces a still-insolvent spared firm once the budget is gone', () => {
    const { economy, firm } = insolventFirm({ 'centralBank.zombieSupport': 1 });
    const workers = [...firm.workers];
    const shortfall = -firmEquity(economy, firm);
    const ledger = openLedger(economy);
    firm.negTicks = FAILURE_TICKS - 1;
    economy.zombieBudget = shortfall;
    bookkeep(economy, ledger);
    expect(firm.negTicks).toBe(FAILURE_TICKS);
    expect(firm.loan).toBeGreaterThan(0);
    economy.zombieBudget = 0;
    bookkeep(economy, ledger);
    expect(firm.loan).toBe(0);
    expect(firm.workers).toEqual(workers);
    expect(firm.capital).toBe(1);
    expect(firm.negTicks).toBe(0);
  });

  it('ignores zombie support under bitcoin', () => {
    const { economy, firm } = insolventFirm({
      'regime.type': 'bitcoin',
      'centralBank.zombieSupport': 1,
      'centralBank.stimulus': 2,
    });
    const workers = [...firm.workers];
    economy.zombieBudget = 1_000_000;
    onCentralBank(economy);
    expect(economy.zombieBudget).toBe(0);
    firm.negTicks = FAILURE_TICKS - 1;
    bookkeep(economy);
    expect(firm.loan).toBe(0);
    expect(firm.workers).toEqual(workers);
    expect(firm.capital).toBe(1);
  });
});

function insolventFirm(sliders: Record<string, number | string>): {
  economy: Economy;
  firm: Firm;
} {
  const config = loadScenario({
    name: 'phase67-unit',
    seed: 2,
    ticks: 1,
    sliders: {
      ...small,
      'regime.type': 'fiat',
      ...sliders,
    },
  });
  const economy = createEconomy(loadParameters(config), config.seed, null);
  const firm = economy.firms[0];
  if (!firm) {
    throw new Error('expected a firm');
  }
  // Keep at least one worker so a spare leaves a non-empty roster to assert on.
  if (firm.workers.length === 0) {
    const household = economy.households[0];
    if (household) {
      household.employer = firm.id;
      firm.workers = [household.id];
    }
  }
  // Wipe productive capital so equity is the loan shortfall. Leave the loan
  // stock alone so bank books still close.
  firm.capital = 0;
  firm.deposit = 0;
  firm.bitcoin = 0;
  firm.bitcoinLoan = 0;
  expect(firm.loan).toBeGreaterThan(0);
  expect(firmEquity(economy, firm)).toBeLessThan(0);
  return { economy, firm };
}

function openLedger(economy: Economy): Ledger {
  const ledger = new Ledger(economy.params.unit);
  ensureOpen(economy, ledger);
  return ledger;
}

function bookkeep(economy: Economy, existing?: Ledger): void {
  const config = loadScenario({
    name: 'phase67-book',
    seed: 2,
    ticks: 1,
    sliders: { ...small, 'regime.type': economy.params.regime },
  });
  const ledger = existing ?? openLedger(economy);
  const recorder = new MetricsRecorder();
  const ctx: TickContext = {
    tick: 0,
    config,
    rng: economy.shockRng,
    ledger,
    metrics: recorder,
    audit: null,
  };
  onBookkeeping(economy, ctx);
  expect(ledger.audit().ok).toBe(true);
}

function run(
  input: Record<string, number | string> & { ticks?: number },
  shock: ForcedShock | null = null,
): SimulationResult {
  const { ticks = 48, ...sliders } = input;
  return simulate(loadScenario({ name: 'phase67', seed: 3, ticks, sliders }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
