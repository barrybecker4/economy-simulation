import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { FEATURE_OFF } from './feature-off.js';
import { simulate } from './simulate.js';

const presetPath = path.join(
  fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
);
const monetaryPreset = JSON.parse(readFileSync(presetPath, 'utf8')).sliders as Record<
  string,
  number | string
>;

/** Large-scale M comparison; kept out of the default suite for speed. */
describe('round 10 scale integration', () => {
  it('keeps the M consumption gap positive at 4000 households', () => {
    const shared = {
      ...FEATURE_OFF,
      ...monetaryPreset,
      'prices.trendWeight': 0,
      'household.openingDepositMonths': 12,
      'shock.frequency': 0,
      'scale.households': 4000,
      'scale.firms': 200,
      'scale.banks': 4,
      ticks: 120,
    };
    let positive = 0;
    for (const seed of [1, 5]) {
      const fiat = run({ ...shared, 'regime.type': 'fiat' }, seed);
      const bitcoin = run(
        { ...shared, 'regime.type': 'bitcoin', 'housing.openingMortgageShareOfOwners': 0 },
        seed,
      );
      expect(fiat.audit.ok && bitcoin.audit.ok).toBe(true);
      const gap =
        (series(bitcoin, 'medianRealConsumption').at(-1) ?? 0) /
          Math.max(series(fiat, 'medianRealConsumption').at(-1) ?? 1, 1e-9) -
        1;
      if (gap > 0) {
        positive += 1;
      }
    }
    expect(positive).toBe(2);
  }, 120_000);
});

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  seed: number,
): SimulationResult {
  const { ticks = 120, ...rest } = sliders;
  return simulate(loadScenario({ name: 'round10-scale', seed, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
