import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate, type ForcedShock } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

const contraction: ForcedShock = { tick: 12, kind: 'demand', size: -0.25 };
const lag = 6;

describe('phase 64 fiat growth floor and crisis stimulus', () => {
  it('rejects a zero money-growth or stimulus weight', () => {
    expect(() =>
      loadScenario({
        name: 'phase64',
        seed: 1,
        ticks: 1,
        sliders: { 'centralBank.moneyGrowth': 0 },
      }),
    ).toThrow(/between/);
    expect(() =>
      loadScenario({
        name: 'phase64',
        seed: 1,
        ticks: 1,
        sliders: { 'centralBank.stimulus': 0 },
      }),
    ).toThrow(/between/);
  });

  it('leaves a calm fiat money path unchanged across stimulus weights', () => {
    const high = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.stimulus': 1,
      ticks: 48,
    });
    const floor = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.stimulus': 0.05,
      ticks: 48,
    });
    expect(high.audit.ok && floor.audit.ok).toBe(true);
    expect(series(high, 'moneySupply')).toEqual(series(floor, 'moneySupply'));
  });

  it('lets prices fall through the stimulus lag before extra money arrives', () => {
    const result = run(
      {
        ...small,
        'regime.type': 'fiat',
        'prices.trendWeight': 0,
        'production.demandWeight': 1,
        'centralBank.stimulus': 1,
        'centralBank.stimulusLag': lag,
        ticks: 36,
      },
      contraction,
    );
    expect(result.audit.ok).toBe(true);
    const prices = series(result, 'priceLevel');
    const start = prices[contraction.tick] ?? 0;
    const afterLag = prices[contraction.tick + lag] ?? 0;
    expect(afterLag).toBeLessThan(start);
  });

  it('raises money supply after the lag under a demand contraction', () => {
    const shared = {
      ...small,
      'regime.type': 'fiat' as const,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      'centralBank.stimulusLag': lag,
      'centralBank.moneyGrowth': 0.05,
      ticks: 36,
    };
    const stimulated = run({ ...shared, 'centralBank.stimulus': 1 }, contraction);
    const quiet = run({ ...shared, 'centralBank.stimulus': 0.05 }, contraction);
    expect(stimulated.audit.ok && quiet.audit.ok).toBe(true);
    const hot = series(stimulated, 'moneySupply');
    const cold = series(quiet, 'moneySupply');
    const from = contraction.tick + lag + 1;
    const through = contraction.tick + 11;
    let hotter = false;
    for (let tick = from; tick <= through; tick += 1) {
      if ((hot[tick] ?? 0) > (cold[tick] ?? 0)) {
        hotter = true;
        break;
      }
    }
    expect(hotter).toBe(true);
    expect(hot.at(-1) ?? 0).toBeGreaterThan(cold.at(-1) ?? 0);
  });

  it('ignores stimulus under bitcoin', () => {
    const shared = {
      ...small,
      'regime.type': 'bitcoin' as const,
      'centralBank.moneyGrowth': 0.05,
      'centralBank.stimulusLag': lag,
      ticks: 36,
    };
    const floor = run({ ...shared, 'centralBank.stimulus': 0.05 }, contraction);
    const high = run({ ...shared, 'centralBank.stimulus': 2 }, contraction);
    expect(series(floor, 'moneySupply')).toEqual(series(high, 'moneySupply'));
  });
});

function run(
  input: Record<string, number | string> & { ticks?: number },
  shock: ForcedShock | null = null,
): SimulationResult {
  const { ticks = 48, ...sliders } = input;
  return simulate(loadScenario({ name: 'phase64', seed: 3, ticks, sliders }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
