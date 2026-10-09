import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { FEATURE_OFF } from './feature-off.js';
import { simulate } from './simulate.js';

const sticky = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'wage.nominalRigidity': 0.95,
  'labor.wageElasticity': 0.5,
  'prices.trendWeight': 0,
  'production.demandWeight': 1,
  'regime.type': 'fiat',
};

describe('phase 42 extreme sticky-wage guard', () => {
  it('keeps unemployment below 50 percent under a demand shock', () => {
    const result = run({ ...sticky, ticks: 120 }, { tick: 24, kind: 'demand', size: 0.15 });
    expect(Math.max(...series(result, 'unemployment'))).toBeLessThan(0.5);
  });
});

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  shock?: { tick: number; kind: 'credit' | 'demand' | 'productivity'; size: number },
): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase42', seed: 7, ticks, sliders: rest }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
