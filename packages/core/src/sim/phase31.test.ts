import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 31 endogenous fiat money', () => {
  it('grows fiat deposits at the default money-growth rule', () => {
    const growing = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.moneyGrowth': 1,
      ticks: 120,
    });
    const floor = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.moneyGrowth': 0.05,
      ticks: 120,
    });
    expect(growing.audit.ok && floor.audit.ok).toBe(true);
    const growMoney = series(growing, 'moneySupply');
    const floorMoney = series(floor, 'moneySupply');
    expect(growMoney.at(-1) ?? 0).toBeGreaterThan(floorMoney.at(-1) ?? 0);
    const years = 10;
    const ratio = (growMoney.at(-1) ?? 0) / Math.max(growMoney[0] ?? 1, 1);
    expect(ratio).toBeGreaterThan(1.1 ** years * 0.5);
  });

  it('ignores money growth under bitcoin', () => {
    const off = run({
      ...small,
      'regime.type': 'bitcoin',
      'centralBank.moneyGrowth': 0.05,
      ticks: 60,
    });
    const on = run({
      ...small,
      'regime.type': 'bitcoin',
      'centralBank.moneyGrowth': 1,
      ticks: 60,
    });
    expect(series(off, 'moneySupply')).toEqual(series(on, 'moneySupply'));
  });

  it('matches itself when money growth is pinned at the floor', () => {
    const first = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.moneyGrowth': 0.05,
      ticks: 24,
    });
    const second = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.moneyGrowth': 0.05,
      ticks: 24,
    });
    expect(series(first, 'moneySupply')).toEqual(series(second, 'moneySupply'));
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase31', seed: 2, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
