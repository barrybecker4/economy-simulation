import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import { simulate } from '../sim/simulate.js';

const METRICS = [
  'medianRealConsumption',
  'medianRealWealth',
  'unemployment',
  'medianDebtService',
  'mortgageShare',
  'rentShare',
  'ownedShare',
] as const satisfies readonly MetricId[];

export interface TransitionBand {
  median: number;
  p5: number;
  p95: number;
}

export interface TransitionPathReport {
  path: 'fiat' | 'bitcoin' | 'transition';
  bands: Record<(typeof METRICS)[number], TransitionBand>;
}

/** 120-month comparison across steady fiat, steady bitcoin, and a 12-month transition. */
export function runTransitionComparison(
  seeds: readonly number[] = [1, 2, 3, 4, 5],
): TransitionPathReport[] {
  return [
    summarize('fiat', seeds, {
      'regime.type': 'fiat',
      'transition.lengthMonths': 0,
      'housing.tenureChoice': 'on',
      'shock.frequency': 0,
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
    }),
    summarize('bitcoin', seeds, {
      'regime.type': 'bitcoin',
      'transition.lengthMonths': 0,
      'housing.tenureChoice': 'on',
      'shock.frequency': 0,
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
    }),
    summarize('transition', seeds, {
      'regime.type': 'fiat',
      'transition.lengthMonths': 12,
      'transition.debtHaircut': 0.05,
      'transition.holderConcentration': 0.7,
      'housing.tenureChoice': 'on',
      'shock.frequency': 0,
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
    }),
  ];
}

function summarize(
  path: TransitionPathReport['path'],
  seeds: readonly number[],
  sliders: Record<string, number | string>,
): TransitionPathReport {
  const endings = Object.fromEntries(METRICS.map((id) => [id, [] as number[]])) as Record<
    (typeof METRICS)[number],
    number[]
  >;
  for (const seed of seeds) {
    const result = simulate(loadScenario({ name: 'transition', seed, ticks: 120, sliders }));
    for (const id of METRICS) {
      const series = result.metrics.series[id];
      const last = series[series.length - 1];
      endings[id].push(typeof last === 'number' ? last : 0);
    }
  }
  const bands = {} as TransitionPathReport['bands'];
  for (const id of METRICS) {
    bands[id] = band(endings[id]);
  }
  return { path, bands };
}

function band(values: number[]): TransitionBand {
  const sorted = [...values].sort((left, right) => left - right);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const p5 = sorted[Math.max(0, Math.floor(0.05 * (sorted.length - 1)))] ?? median;
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * (sorted.length - 1)))] ?? median;
  return { median, p5, p95 };
}
