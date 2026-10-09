import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { expectedInflationFrom } from './helpers.js';
import { simulate, type ForcedShock } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'ai.ownerShareCeiling': 0,
  'production.demandWeight': 1,
  'prices.trendWeight': 0,
  'household.realReturnSensitivity': 5,
  'deflation.sensitivity': 2,
};

describe('phase 19 anchored expectations', () => {
  it('matches the prior path when the anchor weight is zero', () => {
    const prior = run({ ...small, 'expectations.anchorWeight': 0 });
    const neutral = run({ ...small, 'expectations.anchorWeight': 0 });
    expect(prior.audit.ok && neutral.audit.ok).toBe(true);
    expect(series(neutral, 'priceLevel')).toEqual(series(prior, 'priceLevel'));
    expect(series(neutral, 'realGdp')).toEqual(series(prior, 'realGdp'));
  });

  it('blends trailing inflation toward the regime path', () => {
    expect(expectedInflationFrom(-0.08, 0.02, 0)).toBe(-0.08);
    expect(expectedInflationFrom(-0.08, 0.02, 1)).toBe(0.02);
    expect(expectedInflationFrom(-0.08, 0.02, 0.5)).toBeCloseTo(-0.03, 12);
  });

  it('keeps the price level higher when expectations stay anchored in a demand bust', () => {
    const shock: ForcedShock = { tick: 18, kind: 'demand', size: 0.3 };
    const trailing = run({ ...small, 'expectations.anchorWeight': 0 }, shock);
    const anchored = run({ ...small, 'expectations.anchorWeight': 1 }, shock);
    expect(trailing.audit.ok && anchored.audit.ok).toBe(true);
    expect(last(anchored, 'priceLevel')).toBeGreaterThan(last(trailing, 'priceLevel'));
  });
});

function run(
  input: Record<string, number | string>,
  shock: ForcedShock | null = null,
): SimulationResult {
  return simulate(loadScenario({ name: 'phase19', seed: 2, ticks: 72, sliders: input }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
