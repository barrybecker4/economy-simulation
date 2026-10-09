import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { FEATURE_OFF } from './feature-off.js';
import { simulate } from './simulate.js';

/**
 * Round-7 defaults under demand-led prices: fiscal stabilizer and housing
 * tenure. On seed 7 of the monetary preset, tenure is the consumption drag;
 * the stabilizer does not move calm (or mild-shock) median real consumption
 * because the unemployment gap stays inside the region that raises spending.
 * Proportional rationing keeps zero-consumption months off this seed set.
 */
const presetPath = path.join(
  fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
);
const monetaryPreset = JSON.parse(readFileSync(presetPath, 'utf8')).sliders as Record<
  string,
  number | string
>;

const shared = {
  ...FEATURE_OFF,
  ...monetaryPreset,
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
  'regime.type': 'fiat',
  ticks: 120,
};

describe('consumption gap round-7 defaults', () => {
  it('attributes the calm consumption drag to tenure, not the stabilizer', () => {
    const baseline = run(shared);
    const noStabilizer = run({ ...shared, 'government.stabilizer': 0 });
    const noTenure = run({ ...shared, 'housing.tenureChoice': 'off' });
    const bothOff = run({
      ...shared,
      'government.stabilizer': 0,
      'housing.tenureChoice': 'off',
    });
    expect(baseline.audit.ok && noStabilizer.audit.ok && noTenure.audit.ok && bothOff.audit.ok).toBe(
      true,
    );
    const end = (result: SimulationResult) =>
      series(result, 'medianRealConsumption').at(-1) ?? 0;
    const base = end(baseline);
    const stabilizerGap = end(noStabilizer) / Math.max(base, 1e-9) - 1;
    const tenureGap = end(noTenure) / Math.max(base, 1e-9) - 1;
    const bothGap = end(bothOff) / Math.max(base, 1e-9) - 1;
    // Stabilizer off matches baseline on this calm seed.
    expect(Math.abs(stabilizerGap)).toBeLessThan(0.01);
    // Tenure off frees mortgage reservations and raises end consumption.
    expect(tenureGap).toBeGreaterThan(0.05);
    expect(bothGap).toBeCloseTo(tenureGap, 5);
    expect(base).toBeGreaterThan(0.01);
    expect(zeroMonths(baseline)).toBe(0);
  });

  it('keeps zero-consumption months off across twenty calm fiat seeds', () => {
    let seedsWithZero = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const result = simulate(
        loadScenario({
          name: 'consumption-gap-seeds',
          seed,
          ticks: 120,
          sliders: {
            ...FEATURE_OFF,
            ...monetaryPreset,
            'scale.households': 40,
            'scale.firms': 4,
            'scale.banks': 1,
            'shock.frequency': 0,
            'regime.type': 'fiat',
          },
        }),
      );
      expect(result.audit.ok).toBe(true);
      if (zeroMonths(result) > 0) {
        seedsWithZero += 1;
      }
    }
    expect(seedsWithZero).toBe(0);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 120, ...rest } = sliders;
  return simulate(loadScenario({ name: 'consumption-gap', seed: 7, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function zeroMonths(result: SimulationResult): number {
  return series(result, 'medianRealConsumption').filter((value) => value <= 0.01).length;
}
