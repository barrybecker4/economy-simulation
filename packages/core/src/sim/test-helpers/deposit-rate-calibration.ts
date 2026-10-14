import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from '../../config/load.js';
import type { MetricId } from '../../metrics/metrics.js';
import type { SimulationResult } from '../../engine/engine.js';
import { simulate } from '../simulate.js';

const presetPath = path.join(
  fileURLToPath(new URL('../../../../../scenarios/presets/monetary.json', import.meta.url)),
);

export const monetaryPreset = JSON.parse(readFileSync(presetPath, 'utf8')).sliders as Record<
  string,
  number | string
>;

/** Issue #15 measurement protocol: 500/50/3, 240 months, means over months 24–240. */
export const ISSUE_SCALE = {
  'scale.households': 500,
  'scale.firms': 50,
  'scale.banks': 3,
} as const;

export const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const WINDOW_START = 24;
export const WINDOW_END = 240;
export const ARM_TIMEOUT = 60_000;

export interface SeedSummary {
  mean: number;
  median: number;
  min: number;
  max: number;
  ratios: number[];
}

export function summarizeArm(sliders: Record<string, number | string>): SeedSummary {
  const ratios: number[] = [];
  for (const seed of SEEDS) {
    const result = runArm(sliders, seed);
    if (!result.audit.ok) {
      throw new Error(`audit failed on seed ${seed}`);
    }
    const ratio = paidPolicyRatio(result);
    if (ratio <= 0) {
      throw new Error(`paid/policy was ${ratio} on seed ${seed}`);
    }
    ratios.push(ratio);
  }
  return summarize(ratios);
}

export function logArm(label: string, summary: SeedSummary): void {
  console.log(
    `${label}: mean=${summary.mean.toFixed(3)} median=${summary.median.toFixed(3)} ` +
      `range=[${summary.min.toFixed(3)}, ${summary.max.toFixed(3)}] ` +
      `seeds=[${summary.ratios.map((value) => value.toFixed(3)).join(', ')}]`,
  );
}

function runArm(sliders: Record<string, number | string>, seed: number): SimulationResult {
  return simulate(
    loadScenario({
      name: 'deposit-rate-calibration',
      seed,
      ticks: WINDOW_END,
      sliders: { ...sliders, ...ISSUE_SCALE },
    }),
  );
}

function paidPolicyRatio(result: SimulationResult): number {
  let paidSum = 0;
  let policySum = 0;
  const paid = series(result, 'paidDepositRate');
  const policy = series(result, 'interestRate');
  const last = Math.min(WINDOW_END, paid.length - 1, policy.length - 1);
  for (let tick = WINDOW_START; tick <= last; tick += 1) {
    const paidRate = paid[tick];
    const policyRate = policy[tick];
    if (paidRate === undefined || policyRate === undefined || policyRate <= 0) {
      continue;
    }
    paidSum += paidRate;
    policySum += policyRate;
  }
  return policySum > 0 ? paidSum / policySum : 0;
}

function summarize(ratios: number[]): SeedSummary {
  const sorted = [...ratios].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : (sorted[mid] ?? 0);
  return {
    mean: ratios.reduce((sum, value) => sum + value, 0) / Math.max(ratios.length, 1),
    median,
    min: Math.min(...ratios),
    max: Math.max(...ratios),
    ratios,
  };
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
