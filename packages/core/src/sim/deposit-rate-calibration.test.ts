import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

const presetPath = path.join(
  fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
);
const monetaryPreset = JSON.parse(readFileSync(presetPath, 'utf8')).sliders as Record<
  string,
  number | string
>;

/** Issue #15 measurement protocol: 500/50/3, 240 months, means over months 24–240. */
const ISSUE_SCALE = {
  'scale.households': 500,
  'scale.firms': 50,
  'scale.banks': 3,
} as const;

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const WINDOW_START = 24;
const WINDOW_END = 240;
const ARM_TIMEOUT = 60_000;

interface SeedSummary {
  mean: number;
  median: number;
  min: number;
  max: number;
  ratios: number[];
}

describe('deposit rate calibration (issue #15)', () => {
  it('S0 fiat paid/policy mean and range over 10 seeds', { timeout: ARM_TIMEOUT }, () => {
    expectBand('S0 fiat', summarizeArm({ 'regime.type': 'fiat' }));
  });

  it('S0 bitcoin paid/policy mean and range over 10 seeds', { timeout: ARM_TIMEOUT }, () => {
    expectBand('S0 bitcoin', summarizeArm({ 'regime.type': 'bitcoin' }));
  });

  it('M bitcoin paid/policy mean and range over 10 seeds', { timeout: ARM_TIMEOUT }, () => {
    expectBand('M bitcoin', summarizeArm({ ...monetaryPreset, 'regime.type': 'bitcoin' }));
  });

  it('M fiat paid/policy is in 0.3–0.6 (median over 10 seeds)', { timeout: ARM_TIMEOUT }, () => {
    expectBand('M fiat', summarizeArm({ ...monetaryPreset, 'regime.type': 'fiat' }));
  });

  it(
    'M fiat sensitivity at pass-through 0.3 sits below the 0.45 preset',
    { timeout: ARM_TIMEOUT },
    () => {
      const summary = summarizeArm({
        ...monetaryPreset,
        'regime.type': 'fiat',
        'bank.depositPassThrough': 0.3,
      });
      logArm('M fiat pass-through 0.3', summary);
      expect(summary.mean).toBeLessThanOrEqual(0.3);
    },
  );

  it(
    'M fiat sensitivity at pass-through 0.6 sits above the 0.45 preset',
    { timeout: ARM_TIMEOUT },
    () => {
      const summary = summarizeArm({
        ...monetaryPreset,
        'regime.type': 'fiat',
        'bank.depositPassThrough': 0.6,
      });
      logArm('M fiat pass-through 0.6', summary);
      expect(summary.mean).toBeGreaterThan(0.45);
      expect(summary.mean).toBeLessThanOrEqual(0.6);
    },
  );
});

function summarizeArm(sliders: Record<string, number | string>): SeedSummary {
  const ratios: number[] = [];
  for (const seed of SEEDS) {
    const result = runArm(sliders, seed);
    expect(result.audit.ok).toBe(true);
    const ratio = paidPolicyRatio(result);
    expect(ratio).toBeGreaterThan(0);
    ratios.push(ratio);
  }
  return summarize(ratios);
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

function expectBand(label: string, summary: SeedSummary): void {
  logArm(label, summary);
  expect(summary.median).toBeGreaterThanOrEqual(0.3);
  expect(summary.median).toBeLessThanOrEqual(0.6);
}

function logArm(label: string, summary: SeedSummary): void {
  console.log(
    `${label}: mean=${summary.mean.toFixed(3)} median=${summary.median.toFixed(3)} ` +
      `range=[${summary.min.toFixed(3)}, ${summary.max.toFixed(3)}] ` +
      `seeds=[${summary.ratios.map((value) => value.toFixed(3)).join(', ')}]`,
  );
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
