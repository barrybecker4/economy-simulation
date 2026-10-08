import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { createEconomy } from './init.js';
import { employmentTarget } from './labor.js';
import { loadParameters } from './parameters.js';
import { simulate, type ForcedShock } from './simulate.js';

describe('phase 58 productivity shock through costs', () => {
  it('does not scale the quota by the impulse when wage elasticity is zero', () => {
    const economy = opened({ 'labor.wageElasticity': 0 });
    economy.productivityImpulse = 0;
    const calm = employmentTarget(economy);
    economy.productivityImpulse = -0.2;
    expect(employmentTarget(economy)).toBe(calm);
  });

  it('cuts the quota while a negative productivity impulse is active', () => {
    const economy = opened({ 'labor.wageElasticity': 0.5 });
    economy.productivityImpulse = 0;
    const calm = employmentTarget(economy);
    economy.productivityImpulse = -0.2;
    expect(employmentTarget(economy)).toBeLessThan(calm);
  });

  it('raises output during a positive productivity shock and closes the flexible-wage gap afterward', () => {
    const calm = run(null);
    const boom = run({ tick: 24, kind: 'productivity', size: 0.1 });
    const slump = run({ tick: 24, kind: 'productivity', size: -0.1 });
    expect(calm.audit.ok && boom.audit.ok && slump.audit.ok).toBe(true);
    expect(series(boom, 'realGdp')[30] ?? 0).toBeGreaterThan(series(calm, 'realGdp')[30] ?? 0);
    const during = Math.abs(gap(slump, calm, 30));
    const after = Math.abs(gap(slump, calm, 60));
    expect(after).toBeLessThan(during);
  });
});

function opened(sliders: Record<string, number | string>) {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'phase58-quota',
        seed: 1,
        ticks: 1,
        sliders: {
          'scale.households': 40,
          'scale.firms': 4,
          'scale.banks': 1,
          'regime.type': 'fiat',
          ...sliders,
        },
      }),
    ),
    1,
    null,
  );
}

function run(shock: ForcedShock | null): SimulationResult {
  return simulate(
    loadScenario({
      name: 'phase58',
      seed: 3,
      ticks: 72,
      sliders: {
        'scale.households': 60,
        'scale.firms': 6,
        'scale.banks': 1,
        'shock.frequency': 0,
        'regime.type': 'fiat',
        'wage.nominalRigidity': 0,
      },
    }),
    shock,
  );
}

function gap(shocked: SimulationResult, calm: SimulationResult, tick: number): number {
  const base = series(calm, 'realGdp')[tick] ?? 1;
  return ((series(shocked, 'realGdp')[tick] ?? 0) - base) / Math.max(base, 1);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
