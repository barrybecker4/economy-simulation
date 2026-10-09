import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { capitalClaims } from './equity.js';
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

describe('phase 26 equity wealth', () => {
  it('matches deposit wealth when the equity market is off', () => {
    const first = run({ ...small, 'equity.marketOn': 'off' });
    const second = run({ ...small, 'equity.marketOn': 'off' });
    expect(first.audit.ok && second.audit.ok).toBe(true);
    expect(series(second, 'giniWealth')).toEqual(series(first, 'giniWealth'));
  });

  it('gives a larger claim to the higher skill', () => {
    const claims = capitalClaims({ capitalValue: 100, skills: [1, 2], concentration: 1.5 });
    expect(claims[1] ?? 0).toBeGreaterThan(claims[0] ?? 0);
    expect((claims[0] ?? 0) + (claims[1] ?? 0)).toBeCloseTo(100, 6);
  });

  it('raises the wealth Gini once capital claims are counted', () => {
    const concentrated = {
      'ai.bullishness': 1,
      'ai.adoptionMidpointYear': 2,
      'ai.adoptionSteepness': 1.5,
      'ai.physicalTaskShare': 0.3,
      'ai.ownershipConcentration': 0.95,
    };
    const deposits = run({
      ...small,
      ...concentrated,
      'equity.marketOn': 'off',
    });
    const equity = run({
      ...small,
      ...concentrated,
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
