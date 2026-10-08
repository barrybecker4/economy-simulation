import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate, type ForcedShock } from './simulate.js';

const base = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'prices.trendWeight': 0,
  'production.demandWeight': 1,
  'regime.type': 'fiat',
  'labor.firmLevelHiring': 'on',
};

const shock: ForcedShock = { tick: 12, kind: 'demand', size: -0.3 };

describe('phase 59 sticky wages', () => {
  it('keeps a sticky demand shock above the natural rate without a collapse', () => {
    const sticky = run({ ...base, 'wage.nominalRigidity': 0.95 });
    const flexible = run({ ...base, 'wage.nominalRigidity': 0 });
    expect(sticky.audit.ok && flexible.audit.ok).toBe(true);
    const stickyUnemployment = end(sticky, 'unemployment');
    const flexibleUnemployment = end(flexible, 'unemployment');
    const natural = end(sticky, 'naturalUnemployment');
    expect(stickyUnemployment).toBeGreaterThan(flexibleUnemployment);
    expect(stickyUnemployment).toBeGreaterThan(natural);
    expect(stickyUnemployment).toBeGreaterThan(0.01);
    expect(stickyUnemployment).toBeLessThan(0.5);
    expect(end(sticky, 'medianRealConsumption')).toBeGreaterThan(0);
  });
});

function run(sliders: Record<string, number | string>): SimulationResult {
  return simulate(
    loadScenario({ name: 'phase59', seed: 5, ticks: 72, sliders }),
    shock,
  );
}

function end(result: SimulationResult, id: MetricId): number {
  return result.metrics.series[id].at(-1) ?? 0;
}
