import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

/**
 * Issue #13: bitcoin bank credit and mortgage tenure.
 *
 * Headline-suite arms (500/50/3, 240 months, AI fixed at 0.3, shocks off).
 * Targets at month 239 from the issue (not loosened):
 * - Fiat: creditToGdp 0.43–0.70, owners-with-mortgage 55–67%
 * - Bitcoin: creditToGdp ≥ 0.30, owners-with-mortgage ≥ 40%
 *
 * Bitcoin credit/GDP may exceed fiat: the same living mortgage book is
 * divided by a falling deflator. That is reported, not clamped.
 */

const SCALE = {
  'scale.households': 500,
  'scale.firms': 50,
  'scale.banks': 3,
  'ai.automatableShareStart': 0.3,
  'ai.automatableShareEnd': 0.3,
  'shock.frequency': 0,
} as const;

const S0 = {
  'prices.trendWeight': 1,
  'production.demandWeight': 0,
  'labor.firmLevelHiring': 'off',
  'household.realReturnSensitivity': 0,
} as const;

const monetaryPreset = JSON.parse(
  readFileSync(
    path.join(
      fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
    ),
    'utf8',
  ),
).sliders as Record<string, number | string>;

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const LONG_TEST_TIMEOUT = 180_000;

interface ArmStats {
  credit: { mean: number; min: number; max: number };
  ownersWithMortgage: { mean: number; min: number; max: number };
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}

function ownersWithMortgage(result: SimulationResult): number {
  const mortgage = last(result, 'mortgageShare');
  const owned = last(result, 'ownedShare');
  const owners = mortgage + owned;
  return owners > 0 ? mortgage / owners : 0;
}

function stats(values: number[]): { mean: number; min: number; max: number } {
  return {
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function runArm(
  extra: Record<string, number | string>,
  regime: 'fiat' | 'bitcoin',
  seed: number,
): SimulationResult {
  return simulate(
    loadScenario({
      name: `issue-13-${regime}-${seed}`,
      seed,
      ticks: 240,
      sliders: {
        ...SCALE,
        ...extra,
        'regime.type': regime,
      },
    }),
  );
}

function measure(
  label: string,
  extra: Record<string, number | string>,
  regime: 'fiat' | 'bitcoin',
  seeds: readonly number[],
): ArmStats {
  const credit: number[] = [];
  const mortgage: number[] = [];
  for (const seed of seeds) {
    const result = runArm(extra, regime, seed);
    expect(result.audit.ok).toBe(true);
    credit.push(last(result, 'creditToGdp'));
    mortgage.push(ownersWithMortgage(result));
  }
  const creditStats = stats(credit);
  const mortgageStats = stats(mortgage);
  console.log(
    `${label}: credit=${creditStats.mean.toFixed(3)} [${creditStats.min.toFixed(3)}, ${creditStats.max.toFixed(3)}] ` +
      `ownersWithMortgage=${mortgageStats.mean.toFixed(3)} [${mortgageStats.min.toFixed(3)}, ${mortgageStats.max.toFixed(3)}]`,
  );
  return { credit: creditStats, ownersWithMortgage: mortgageStats };
}

describe('issue #13 bitcoin credit and mortgage tenure', () => {
  it(
    'keeps S0 fiat in band and S0 bitcoin above the floors (10 seeds)',
    { timeout: LONG_TEST_TIMEOUT },
    () => {
      const fiat = measure('S0 fiat', S0, 'fiat', SEEDS);
      const bitcoin = measure('S0 bitcoin', S0, 'bitcoin', SEEDS);

      expect(fiat.credit.mean).toBeGreaterThanOrEqual(0.43);
      expect(fiat.credit.mean).toBeLessThanOrEqual(0.7);
      expect(fiat.ownersWithMortgage.mean).toBeGreaterThanOrEqual(0.55);
      expect(fiat.ownersWithMortgage.mean).toBeLessThanOrEqual(0.67);

      expect(bitcoin.credit.mean).toBeGreaterThanOrEqual(0.3);
      expect(bitcoin.ownersWithMortgage.mean).toBeGreaterThanOrEqual(0.4);
    },
  );

  it(
    'keeps M fiat in band and M bitcoin above the floors (10 seeds)',
    { timeout: LONG_TEST_TIMEOUT },
    () => {
      const extra = { ...monetaryPreset, 'household.realReturnSensitivity': 0 };
      const fiat = measure('M fiat', extra, 'fiat', SEEDS);
      const bitcoin = measure('M bitcoin', extra, 'bitcoin', SEEDS);

      expect(fiat.credit.mean).toBeGreaterThanOrEqual(0.43);
      expect(fiat.credit.mean).toBeLessThanOrEqual(0.7);
      expect(fiat.ownersWithMortgage.mean).toBeGreaterThanOrEqual(0.55);
      expect(fiat.ownersWithMortgage.mean).toBeLessThanOrEqual(0.67);

      expect(bitcoin.credit.mean).toBeGreaterThanOrEqual(0.3);
      expect(bitcoin.ownersWithMortgage.mean).toBeGreaterThanOrEqual(0.4);
    },
  );
});
