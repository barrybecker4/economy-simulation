import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { composeCategoryOptions } from '../config/presets.js';
import { Ledger } from '../ledger/ledger.js';
import { MetricsRecorder, type MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { centIdentityGap } from './banking.js';
import { onBookkeeping } from './bookkeeping.js';
import { createEconomy } from './init.js';
import { rebaseNominal } from './nominal-scale.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { ensureOpen } from './stocks.js';

describe('nominal redenomination', () => {
  it('divides a bond stock past the ceiling and keeps the cent books closed', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'rebase',
          seed: 1,
          ticks: 1,
          sliders: {
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
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('missing bank');
    }
    const added = 2e12;
    bank.bonds += added;
    economy.govDeposits += added;
    const config = loadScenario({ name: 'rebase-post', seed: 1, ticks: 1, sliders: {} });
    const ledger = new Ledger(economy.params.unit);
    ensureOpen(economy, ledger);
    rebaseNominal(economy);
    expect(economy.nominalScale).toBe(1000);
    expect(bank.bonds).toBe(added / 1000);
    expect(economy.govDeposits).toBe(added / 1000);
    expect(centIdentityGap(economy)).toBe(0n);
    onBookkeeping(economy, {
      tick: 0,
      config,
      rng: economy.shockRng,
      ledger,
      metrics: new MetricsRecorder(),
      audit: null,
    });
    expect(ledger.audit().ok).toBe(true);
  });

  it('finishes an extreme AI dividend run with a continuous price level', () => {
    const sliders = {
      ...composeCategoryOptions({
        publicFinance: 'ai-dividend',
        aiBullishness: 'extreme',
      }),
      'regime.type': 'fiat',
      'scale.households': 200,
      'scale.firms': 10,
      'scale.banks': 1,
    };
    const result = simulate(loadScenario({ name: 'dividend', seed: 1, ticks: 800, sliders }));
    expect(result.audit.ok).toBe(true);
    const prices = series(result, 'priceLevel');
    expect(prices.every((value) => Number.isFinite(value) && value > 0)).toBe(true);
    expect(Math.max(...prices)).toBeGreaterThan(1e12);
    for (let index = 12; index < prices.length; index += 1) {
      const ratio = (prices[index] ?? 0) / (prices[index - 1] ?? 1);
      expect(ratio).toBeGreaterThan(0.9);
      expect(ratio).toBeLessThan(1.1);
    }
  }, 30_000);
});

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
