import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { capitalClaims } from './equity.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'ai.ownerShareCeiling': 0,
};

describe('phase 26 equity wealth', () => {
  it('matches deposit wealth when the equity market is off', () => {
    const prior = run(small);
    const neutral = run({ ...small, 'equity.marketOn': 'off' });
    expect(prior.audit.ok && neutral.audit.ok).toBe(true);
    expect(series(neutral, 'giniWealth')).toEqual(series(prior, 'giniWealth'));
  });

  it('gives a larger claim to the higher skill', () => {
    const claims = capitalClaims({ capitalValue: 100, skills: [1, 2], concentration: 1.5 });
    expect(claims[1] ?? 0).toBeGreaterThan(claims[0] ?? 0);
    expect((claims[0] ?? 0) + (claims[1] ?? 0)).toBeCloseTo(100, 6);
  });

  it('raises the wealth Gini once capital claims are counted', () => {
    const deposits = run({
      ...small,
      'ai.adoptionMidpointYear': 2,
      'ai.adoptionSteepness': 1.5,
      'ai.ownershipConcentration': 0.95,
      'equity.marketOn': 'off',
    });
    const equity = run({
      ...small,
      'ai.adoptionMidpointYear': 2,
      'ai.adoptionSteepness': 1.5,
      'ai.ownershipConcentration': 0.95,
      'equity.marketOn': 'on',
    });
    expect(deposits.audit.ok && equity.audit.ok).toBe(true);
    expect(last(equity, 'giniWealth')).toBeGreaterThan(last(deposits, 'giniWealth'));
    expect(last(equity, 'capitalShare')).toBeGreaterThan(0);
  });
});

function run(input: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'phase26', seed: 2, ticks: 72, sliders: input }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
