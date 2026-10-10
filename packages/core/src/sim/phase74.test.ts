import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { MetricsRecorder, type MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { Ledger } from '../ledger/ledger.js';
import { addBonds } from './banking.js';
import { firmEquity, onBookkeeping } from './bookkeeping.js';
import type { Economy } from './economy.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { FAILURE_TICKS } from './rules.js';
import { simulate, type ForcedShock } from './simulate.js';
import { ensureOpen } from './stocks.js';

describe('phase 74 bond cap and replacement employment', () => {
  it('throws when a bond balance would exceed the safe integer range', () => {
    const economy = opened();
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('missing bank');
    }
    bank.bonds = Number.MAX_SAFE_INTEGER - 10;
    expect(() => addBonds(bank, 20)).toThrow(/safe integer/);
  });

  it('keeps workers when a firm is replaced', () => {
    const economy = opened();
    const firm = economy.firms[0];
    if (!firm) {
      throw new Error('missing firm');
    }
    if (firm.workers.length === 0) {
      const household = economy.households[0];
      if (household) {
        household.employer = firm.id;
        firm.workers = [household.id];
      }
    }
    // Wipe capital and deposits so equity is the loan shortfall; leave the loan
    // so bank books still close.
    firm.capital = 0;
    firm.deposit = 0;
    firm.bitcoin = 0;
    firm.bitcoinLoan = 0;
    expect(firm.loan).toBeGreaterThan(0);
    expect(firmEquity(economy, firm)).toBeLessThan(0);
    const workers = [...firm.workers];
    firm.negTicks = FAILURE_TICKS - 1;
    economy.zombieBudget = 0;
    const config = loadScenario({
      name: 'phase74',
      seed: 1,
      ticks: 1,
      sliders: {
        ...FEATURE_OFF,
        'scale.households': 40,
        'scale.firms': 4,
        'scale.banks': 1,
        'regime.type': 'fiat',
      },
    });
    const ledger = new Ledger(economy.params.unit);
    ensureOpen(economy, ledger);
    onBookkeeping(economy, {
      tick: 0,
      config,
      rng: economy.shockRng,
      ledger,
      metrics: new MetricsRecorder(),
      audit: null,
    });
    expect(ledger.audit().ok).toBe(true);
    expect(firm.loan).toBe(0);
    expect(firm.workers).toEqual(workers);
    expect(firm.capital).toBe(1);
    for (const id of workers) {
      expect(economy.households[id]?.employer).toBe(firm.id);
    }
  });

  it('does not produce one-month unemployment cliffs under a monetary fiat demand shock', () => {
    const calm = run(null);
    const slump = run({ tick: 12, kind: 'demand', size: -0.3 });
    expect(calm.audit.ok && slump.audit.ok).toBe(true);
    const path = series(slump, 'unemployment');
    let maxJump = 0;
    for (let tick = 1; tick < path.length; tick += 1) {
      maxJump = Math.max(maxJump, (path[tick] ?? 0) - (path[tick - 1] ?? 0));
    }
    expect(maxJump).toBeLessThan(0.2);
  });
});

function opened(): Economy {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'phase74-open',
        seed: 1,
        ticks: 1,
        sliders: {
          ...FEATURE_OFF,
          'scale.households': 40,
          'scale.firms': 4,
          'scale.banks': 1,
          'regime.type': 'fiat',
        },
      }),
    ),
    1,
    null,
  );
}

function run(shock: ForcedShock | null): SimulationResult {
  return simulate(
    loadScenario({
      name: 'phase74-shock',
      seed: 4,
      ticks: 48,
      sliders: {
        ...FEATURE_OFF,
        'scale.households': 40,
        'scale.firms': 4,
        'scale.banks': 1,
        'shock.frequency': 0,
        'regime.type': 'fiat',
        'prices.trendWeight': 0,
        'production.demandWeight': 1,
        'bank.depositPassThrough': 1,
        'household.openingDepositMonths': 12,
        'credit.endogenousWeight': 1,
        'credit.leverageStart': 1,
      },
    }),
    shock,
  );
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
