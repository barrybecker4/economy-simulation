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

/**
 * Registry defaults follow the regime price path (trend weight 1), so early jumps
 * stay near 0.06. Demand-led monetary openings are noisier; with lower opening
 * deposits (6.5 vs 30 months), early consumption adjusts more sharply, raising
 * the cap from 0.16 to 0.35 to accommodate realistic velocity calibration.
 * Housing mobility adds additional early activity as mortgagors refinance,
 * increasing caps to 0.19 and 0.37 respectively. Annual wage reviews (issue #10)
 * close a larger agreed-wage gap on review months, so the default cap is 0.21.
 */
const DEFAULTS_JUMP_CAP = 0.21;
const MONETARY_JUMP_CAP = 0.37;

describe('opening well-being', () => {
  it('keeps early mean and median jumps small on registry defaults', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const result = simulate(
        loadScenario({
          name: 'opening-wellbeing-defaults',
          seed,
          ticks: 48,
          sliders: {
            'shock.frequency': 0,
            'regime.type': 'fiat',
          },
        }),
      );
      expect(result.audit.ok, `seed ${seed}`).toBe(true);
      assertOpeningJumps(result, seed, DEFAULTS_JUMP_CAP);
    }
  }, 60_000);

  it('keeps early mean and median jumps small on the monetary preset', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const result = simulate(
        loadScenario({
          name: 'opening-wellbeing-monetary',
          seed,
          ticks: 48,
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
      expect(result.audit.ok, `seed ${seed}`).toBe(true);
      assertOpeningJumps(result, seed, MONETARY_JUMP_CAP);
    }
  }, 60_000);
});

function assertOpeningJumps(result: SimulationResult, seed: number, cap: number): void {
  for (const id of ['meanWellbeing', 'medianWellbeing'] as const) {
    const values = series(result, id);
    // Cover the spike-and-drop window that used to peak near tick 2 and crash by tick 4.
    const early = maxAbsJump(values, 1, 5);
    expect(early, `${id} ticks 1–5 seed ${seed}`).toBeLessThan(cap);
  }
}

function maxAbsJump(values: readonly number[], from: number, through: number): number {
  let max = 0;
  for (let index = from; index <= through; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (previous === undefined || current === undefined) {
      continue;
    }
    max = Math.max(max, Math.abs(current - previous));
  }
  return max;
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
