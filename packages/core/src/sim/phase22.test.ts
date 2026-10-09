import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { computeCapacityFactor } from './capacity.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'ai.ownerShareCeiling': 0,
};

describe('phase 22 demographics and compute', () => {
  it('matches the prior path when population is fixed and compute is unproductive', () => {
    const prior = run(small);
    const neutral = run({ ...small, 'population.growth': 0, 'ai.computeProductivity': 0 });
    expect(prior.audit.ok && neutral.audit.ok).toBe(true);
    expect(series(neutral, 'realGdp')).toEqual(series(prior, 'realGdp'));
  });

  it('leaves capacity unchanged when compute productivity is zero', () => {
    expect(computeCapacityFactor(4, 0)).toBe(1);
    expect(computeCapacityFactor(0, 1)).toBe(1);
    expect(computeCapacityFactor(2, 0.5)).toBeCloseTo(2, 12);
  });

  it('raises real GDP when the population grows', () => {
    const fixed = run({ ...small, 'population.growth': 0 });
    const growing = run({ ...small, 'population.growth': 0.02 });
    expect(fixed.audit.ok && growing.audit.ok).toBe(true);
    expect(last(growing, 'realGdp')).toBeGreaterThan(last(fixed, 'realGdp'));
  });

  it('raises real GDP when bought compute is productive', () => {
    const agents = {
      ...small,
      'ai.ownerShareCeiling': 0.8,
      'ai.agentsPerOwnerCeiling': 4,
      'ai.adoptionMidpointYear': 2,
      'ai.adoptionSteepness': 1.5,
      'ai.automatableShareStart': 0.2,
      'ai.automatableShareEnd': 0.8,
    };
    const cashOnly = run({ ...agents, 'ai.computeProductivity': 0 });
    const productive = run({ ...agents, 'ai.computeProductivity': 1 });
    expect(cashOnly.audit.ok && productive.audit.ok).toBe(true);
    expect(last(productive, 'realGdp')).toBeGreaterThan(last(cashOnly, 'realGdp'));
  });
});

function run(input: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'phase22', seed: 2, ticks: 96, sliders: input }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
