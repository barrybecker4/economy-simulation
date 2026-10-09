import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { hiringScale } from './labor.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 11 wage-driven hiring', () => {
  it('leaves the hiring quota unchanged at elasticity 0', () => {
    expect(hiringScale({ realWage: 2, referenceRealWage: 1, elasticity: 0 })).toBe(1);
    expect(hiringScale({ realWage: 0.5, referenceRealWage: 1, elasticity: 0 })).toBe(1);
    expect(hiringScale({ realWage: 1.2, referenceRealWage: 1, elasticity: 1 })).toBeCloseTo(
      0.8,
      12,
    );
  });

  it('raises unemployment under sticky deflation when elasticity is positive', () => {
    const frozen = run({
      ...small,
      'regime.type': 'bitcoin',
      'wage.nominalRigidity': 0.95,
      'labor.wageElasticity': 0,
      'prices.trendWeight': 0,
      ticks: 60,
    });
    const responsive = run({
      ...small,
      'regime.type': 'bitcoin',
      'wage.nominalRigidity': 0.95,
      'labor.wageElasticity': 2,
      'prices.trendWeight': 0,
      ticks: 60,
    });
    expect(frozen.audit.ok && responsive.audit.ok).toBe(true);
    expect(series(responsive, 'unemployment').at(-1) ?? 0).toBeGreaterThan(
      series(frozen, 'unemployment').at(-1) ?? 0,
    );
  });

  it('raises unemployment under deflation when wages are sticky and elasticity is high', () => {
    const flexible = run({
      ...small,
      'regime.type': 'bitcoin',
      'wage.nominalRigidity': 0,
      'labor.wageElasticity': 2,
      'prices.trendWeight': 0,
      ticks: 60,
    });
    const sticky = run({
      ...small,
      'regime.type': 'bitcoin',
      'wage.nominalRigidity': 0.95,
      'labor.wageElasticity': 2,
      'prices.trendWeight': 0,
      ticks: 60,
    });
    expect(series(sticky, 'unemployment').at(-1) ?? 0).toBeGreaterThan(
      series(flexible, 'unemployment').at(-1) ?? 0,
    );
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase11', seed: 2, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
