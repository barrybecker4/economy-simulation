import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

const sticky = {
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
  it('keeps unemployment below 50 percent with emergency flex under a demand shock', () => {
    const result = run(
      { ...sticky, 'wage.emergencyFlex': 0.3, ticks: 120 },
      { tick: 24, kind: 'demand', size: 0.15 },
    );
    const peak = Math.max(...series(result, 'unemployment'));
    expect(peak).toBeLessThan(0.5);
  });

  it('leaves the path unchanged when emergency flex is 0', () => {
    const a = run({ ...sticky, 'wage.emergencyFlex': 0, ticks: 48 });
    const b = run({ ...sticky, ticks: 48 });
    expect(series(a, 'unemployment')).toEqual(series(b, 'unemployment'));
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
