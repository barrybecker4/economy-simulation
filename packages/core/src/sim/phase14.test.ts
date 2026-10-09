import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 14 fiscal constraints', () => {
  it('matches phase 13 when pass-through, bond purchases, and stabilizer are zero', () => {
    const baseline = run({ ...small });
    const tagged = run({
      ...small,
      'bank.depositPassThrough': 0,
      'centralBank.bondPurchaseShare': 0,
      'government.stabilizer': 0,
    });
    expect(baseline.audit.ok && tagged.audit.ok).toBe(true);
    expect(series(baseline, 'priceLevel')).toEqual(series(tagged, 'priceLevel'));
    expect(series(baseline, 'realGdp')).toEqual(series(tagged, 'realGdp'));
    expect(series(baseline, 'baseMoney')).toEqual(series(tagged, 'baseMoney'));
  });

  it('lets fiat stabilization and bond purchases cushion a demand shock', () => {
    const calm = run({
      ...small,
      'regime.type': 'fiat',
      'government.stabilizer': 0,
      'centralBank.bondPurchaseShare': 0,
      'government.spendingShareOfGDP': 0.35,
      'tax.incomeRate': 0.1,
      ticks: 48,
      shock: { tick: 6, kind: 'demand' as const, size: 0.25 },
    });
    const active = run({
      ...small,
      'regime.type': 'fiat',
      'government.stabilizer': 2,
      'centralBank.bondPurchaseShare': 1,
      'government.spendingShareOfGDP': 0.35,
      'tax.incomeRate': 0.1,
      ticks: 48,
      shock: { tick: 6, kind: 'demand' as const, size: 0.25 },
    });
    expect(calm.audit.ok && active.audit.ok).toBe(true);
    // Demand shock contracts over ticks 18–29. Stabilizer support should lift that stretch.
    expect(mean(series(active, 'realGdp').slice(18, 30))).toBeGreaterThan(
      mean(series(calm, 'realGdp').slice(18, 30)),
    );
    expect(series(active, 'baseMoney').at(-1) ?? 0).toBeGreaterThan(
      series(calm, 'baseMoney').at(-1) ?? 0,
    );
  });

  it('keeps bitcoin base money fixed and blocks stabilizer spending', () => {
    const calm = run({
      ...small,
      'regime.type': 'bitcoin',
      'government.stabilizer': 0,
      ticks: 48,
      shock: { tick: 6, kind: 'demand' as const, size: 0.25 },
    });
    const active = run({
      ...small,
      'regime.type': 'bitcoin',
      'government.stabilizer': 1,
      'centralBank.bondPurchaseShare': 1,
      ticks: 48,
      shock: { tick: 6, kind: 'demand' as const, size: 0.25 },
    });
    const activeBase = series(active, 'baseMoney');
    expect(Math.max(...activeBase)).toBeCloseTo(activeBase[0] ?? 0, 6);
    expect(mean(series(active, 'govGoodsSpend'))).toBeLessThanOrEqual(
      mean(series(calm, 'govGoodsSpend')) * 1.05,
    );
  });

  it('cuts discretionary spending when deposit pass-through raises the real return', () => {
    const none = run({
      ...small,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 0,
      'household.realReturnSensitivity': 5,
      'centralBank.inflationTarget': 0,
      ticks: 36,
    });
    const passed = run({
      ...small,
      'regime.type': 'fiat',
      'bank.depositPassThrough': 1,
      'household.realReturnSensitivity': 5,
      'centralBank.inflationTarget': 0,
      ticks: 36,
    });
    expect(mean(series(passed, 'householdGoodsSpend'))).toBeLessThan(
      mean(series(none, 'householdGoodsSpend')),
    );
  });
});

function run(
  input: Record<string, number | string | object | undefined> & {
    ticks?: number;
    shock?: { tick: number; kind: 'credit' | 'demand' | 'productivity'; size: number };
  },
): SimulationResult {
  const { ticks = 48, shock, ...rest } = input;
  const sliders: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'number' || typeof value === 'string') {
      sliders[key] = value;
    }
  }
  return simulate(loadScenario({ name: 'phase14', seed: 2, ticks, sliders }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
