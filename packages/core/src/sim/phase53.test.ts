import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { TickContext } from '../engine/engine.js';
import { Ledger } from '../ledger/ledger.js';
import { MetricsRecorder } from '../metrics/metrics.js';
import { totalDeposits } from './banking.js';
import type { Economy } from './economy.js';
import { onCentralBank } from './central-bank.js';
import { onContractChoice } from './contracts.js';
import { onCredit } from './credit.js';
import { onGoods } from './goods.js';
import { onGovernment } from './government.js';
import { createEconomy } from './init.js';
import { onLabor } from './labor.js';
import { loadParameters } from './parameters.js';
import { onPopulation } from './population.js';
import { onProduction } from './production.js';
import { onBookkeeping } from './bookkeeping.js';
import { onShocks } from './shocks.js';
import { onTransition } from './transition.js';
import { onWelfare } from './welfare.js';

const calm = {
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 53 treasury surplus rebate', () => {
  it('adds a surplus rebate to the income that sets next month demand', () => {
    const hoard = withSurplus(24);
    const rebate = withSurplus(1);
    onGovernment(hoard);
    onGovernment(rebate);
    expect(smoothedIncome(rebate)).toBeGreaterThan(smoothedIncome(hoard));
    expect(rebate.govDeposits).toBeLessThan(hoard.govDeposits);
    expect(rebate.govDeposits).toBeLessThan(5_000);
  });

  it('keeps the treasury inside a small share of deposits', () => {
    for (const regime of ['fiat', 'bitcoin'] as const) {
      const economy = runTicks({ ...calm, 'regime.type': regime }, 80);
      expect(economy.govDeposits / totalDeposits(economy)).toBeLessThan(0.2);
    }
  });
});

function withSurplus(bufferMonths: number): Economy {
  const economy = createEconomy(
    loadParameters(
      loadScenario({
        name: 'phase53-rebate',
        seed: 1,
        ticks: 1,
        sliders: {
          ...calm,
          'regime.type': 'fiat',
          'government.treasuryBufferMonths': bufferMonths,
        },
      }),
    ),
    1,
    null,
  );
  economy.demandBase = 20_000;
  economy.govDeposits = 100_000;
  for (const firm of economy.firms) {
    firm.inventory = 10_000;
    firm.price = 1;
  }
  return economy;
}

function smoothedIncome(economy: Economy): number {
  return economy.households.reduce((sum, household) => sum + household.smoothed, 0);
}

function runTicks(sliders: Record<string, number | string>, ticks: number): Economy {
  const config = loadScenario({ name: 'phase53-run', seed: 3, ticks, sliders });
  const economy = createEconomy(loadParameters(config), config.seed, null);
  const ledger = new Ledger(economy.params.unit);
  const metrics = new MetricsRecorder();
  for (let tick = 0; tick < ticks; tick += 1) {
    const ctx: TickContext = {
      tick,
      config,
      rng: economy.shockRng,
      ledger,
      metrics,
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
  }
  expect(ledger.audit().ok).toBe(true);
  return economy;
}
