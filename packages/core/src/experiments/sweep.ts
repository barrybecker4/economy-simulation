import { execSync } from 'node:child_process';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import { simulate } from '../sim/simulate.js';

export const SWEEP_METRICS = [
  'unemployment',
  'inflation',
  'priceLevel',
  'realGdp',
  'meanWellbeing',
  'medianWellbeing',
  'laborShare',
  'creditToGdp',
  'giniWealth',
] as const satisfies readonly MetricId[];

export interface SweepJob {
  seed: number;
  ticks: number;
  regime: string;
  preset: string;
  sliders: Record<string, number | string>;
}

export interface SweepRow {
  seed: number;
  ticks: number;
  regime: string;
  preset: string;
  commit: string;
  sliders: Record<string, number | string>;
  metrics: Record<(typeof SWEEP_METRICS)[number], number>;
}

let cachedCommit: string | null = null;

export function gitCommit(): string {
  if (cachedCommit !== null) {
    return cachedCommit;
  }
  try {
    cachedCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    cachedCommit = 'unknown';
  }
  return cachedCommit;
}

export function runSweep(jobs: readonly SweepJob[]): SweepRow[] {
  const commit = gitCommit();
  return jobs.map((job) => runJob(job, commit));
}

function runJob(job: SweepJob, commit: string): SweepRow {
  const result = simulate(
    loadScenario({
      name: job.preset,
      seed: job.seed,
      ticks: job.ticks,
      sliders: { ...job.sliders, 'regime.type': job.regime },
    }),
  );
  const metrics = {} as SweepRow['metrics'];
  for (const id of SWEEP_METRICS) {
    const values = result.metrics.series[id];
    metrics[id] = values[values.length - 1] ?? 0;
  }
  return {
    seed: job.seed,
    ticks: job.ticks,
    regime: job.regime,
    preset: job.preset,
    commit,
    sliders: result.config.sliders,
    metrics,
  };
}
