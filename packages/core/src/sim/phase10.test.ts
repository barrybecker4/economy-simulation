import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { BASKET_WEIGHTS } from './basket.js';
import { discretionaryAfterRealReturn, subsistenceShare } from './spending.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 10 spending floor and prices', () => {
  it('keeps the food and housing floor when real-return sensitivity rises', () => {
    const floor = subsistenceShare();
    expect(floor).toBeCloseTo(BASKET_WEIGHTS.food + BASKET_WEIGHTS.housing, 12);
    const uncut = 1000;
    const cut = discretionaryAfterRealReturn({
      uncutBudget: uncut,
      realReturn: 0.05,
      sensitivity: 5,
      floorShare: floor,
    });
    expect(cut).toBeGreaterThanOrEqual(uncut * floor);
    expect(cut).toBeLessThan(uncut);
    expect(
      discretionaryAfterRealReturn({
        uncutBudget: uncut,
        realReturn: 0.05,
        sensitivity: 0,
        floorShare: floor,
      }),
    ).toBe(uncut);
  });

  it('matches the current path when sensitivity is 0 and trend weight is 1', () => {
    const baseline = run({ ...small });
    const tagged = run({
      ...small,
      'household.realReturnSensitivity': 0,
      'prices.trendWeight': 1,
    });
    expect(baseline.audit.ok && tagged.audit.ok).toBe(true);
    expect(series(baseline, 'priceLevel')).toEqual(series(tagged, 'priceLevel'));
    expect(series(baseline, 'householdGoodsSpend')).toEqual(series(tagged, 'householdGoodsSpend'));
    expect(series(baseline, 'realGdp')).toEqual(series(tagged, 'realGdp'));
  });

  it('cuts discretionary spending under deflation while holding the floor', () => {
    const calm = run({
      ...small,
      'regime.type': 'bitcoin',
      'household.realReturnSensitivity': 0,
      ticks: 60,
    });
    const sharp = run({
      ...small,
      'regime.type': 'bitcoin',
      'household.realReturnSensitivity': 5,
      ticks: 60,
    });
    expect(mean(series(sharp, 'householdGoodsSpend'))).toBeLessThan(
      mean(series(calm, 'householdGoodsSpend')),
    );
    const inflation = series(sharp, 'inflation');
    expect(inflation[inflation.length - 1] ?? 0).toBeLessThan(0);
  });

  it('lets excess demand pull the CPI when trend weight is zero', () => {
    const trend = run({
      ...small,
      'prices.trendWeight': 1,
      ticks: 36,
      shock: { tick: 6, kind: 'demand' as const, size: 0.2 },
    });
    const demand = run({
      ...small,
      'prices.trendWeight': 0,
      ticks: 36,
      shock: { tick: 6, kind: 'demand' as const, size: 0.2 },
    });
    // Contraction half of a demand shock: negative impulse lowers desired spend.
    // With trend weight 0, prices follow that shortfall instead of the inflation target.
    const trendPrices = series(trend, 'priceLevel');
    const demandPrices = series(demand, 'priceLevel');
    expect(demandPrices[demandPrices.length - 1] ?? 0).toBeLessThan(
      trendPrices[trendPrices.length - 1] ?? 0,
    );
  });
});

function run(
  input: {
    ticks?: number;
    shock?: { tick: number; kind: 'credit' | 'demand' | 'productivity'; size: number };
  } & Record<string, number | string | undefined | object>,
): SimulationResult {
  const { ticks = 48, shock, ...rest } = input;
  const sliders: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'number' || typeof value === 'string') {
      sliders[key] = value;
    }
  }
  return simulate(loadScenario({ name: 'phase10', seed: 2, ticks, sliders }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
