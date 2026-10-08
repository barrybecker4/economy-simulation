import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { demandedOutput } from './production.js';
import { workersForSales } from './labor.js';
import { simulate, type ForcedShock } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'ai.ownerShareCeiling': 0,
};

describe('phase 18 demand and firm hiring', () => {
  it('matches the prior path when demand weight is zero and firm hiring is off', () => {
    const prior = run(small);
    const neutral = run({ ...small, 'production.demandWeight': 0, 'labor.firmLevelHiring': 'off' });
    expect(prior.audit.ok && neutral.audit.ok).toBe(true);
    expect(series(neutral, 'realGdp')).toEqual(series(prior, 'realGdp'));
    expect(series(neutral, 'unemployment')).toEqual(series(prior, 'unemployment'));
  });

  it('produces full capacity when sales and inventory are already on target', () => {
    expect(demandedOutput({ capacity: 10, expectedSales: 10, inventory: 10 })).toBe(10);
    expect(demandedOutput({ capacity: 10, expectedSales: 4, inventory: 10 })).toBe(4);
    expect(
      workersForSales({
        workers: 8,
        capacity: 10,
        expectedSales: 10,
        alpha: 0.33,
        humanWeight: 1,
      }),
    ).toBe(8);
  });

  it('cuts real GDP after a demand contraction when output follows sales', () => {
    const shock: ForcedShock = { tick: 24, kind: 'demand', size: 0.3 };
    const capacity = run(small, shock);
    const demandLed = run({ ...small, 'production.demandWeight': 1 }, shock);
    expect(capacity.audit.ok && demandLed.audit.ok).toBe(true);
    const contraction = 47;
    expect(series(demandLed, 'realGdp')[contraction] ?? 0).toBeLessThan(
      series(capacity, 'realGdp')[contraction] ?? 0,
    );
  });

  it('raises unemployment under a demand contraction when firm-level hiring is on', () => {
    const shock: ForcedShock = { tick: 24, kind: 'demand', size: -0.3 };
    const quota = run({ ...small, 'production.demandWeight': 1 }, shock);
    const firms = run(
      { ...small, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' },
      shock,
    );
    expect(quota.audit.ok && firms.audit.ok).toBe(true);
    expect(series(firms, 'unemployment')).not.toEqual(series(quota, 'unemployment'));
    const contraction = 35;
    expect(series(firms, 'unemployment')[contraction] ?? 0).toBeGreaterThan(
      series(quota, 'unemployment')[contraction] ?? 0,
    );
    expect(last(firms, 'unemployment')).toBeLessThan(0.5);
  });
});

function run(
  input: Record<string, number | string>,
  shock: ForcedShock | null = null,
): SimulationResult {
  return simulate(loadScenario({ name: 'phase18', seed: 2, ticks: 72, sliders: input }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
