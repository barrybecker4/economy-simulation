import { loadScenario } from '../../core/src/config/load.js';
import { simulate } from '../../core/src/sim/simulate.js';
import type { MetricId } from '../../core/src/metrics/metrics.js';

const CHARTS = [
  'meanWellbeing',
  'medianWellbeing',
  'priceLevel',
  'priceGeneral',
  'priceFood',
  'priceHousing',
  'priceEnergy',
  'priceApparel',
  'priceTransportation',
  'priceMedical',
  'priceEducation',
  'priceRecreation',
  'priceElectronics',
  'unemployment',
  'giniWealth',
  'medianRealWealth',
] as const satisfies readonly MetricId[];

export interface RunRequest {
  kind: 'run' | 'band' | 'compare';
  seed: number;
  ticks: number;
  sliders: Record<string, number | string>;
  seeds?: number[];
}

export interface RunResponse {
  kind: 'run' | 'band' | 'compare';
  ticks: number[];
  series: Record<string, number[]>;
  bands?: Record<string, { low: number[]; mid: number[]; high: number[] }>;
}

self.onmessage = (event: MessageEvent<RunRequest>) => {
  const request = event.data;
  if (request.kind === 'band') {
    const seeds = request.seeds ?? [request.seed];
    const runs = seeds.map((seed) => one(seed, request.ticks, request.sliders));
    const bands: NonNullable<RunResponse['bands']> = {};
    for (const id of CHARTS) {
      const columns = runs.map((run) => run.series[id] ?? []);
      const length = columns[0]?.length ?? 0;
      const low: number[] = [];
      const mid: number[] = [];
      const high: number[] = [];
      for (let index = 0; index < length; index += 1) {
        const column = columns
          .map((series) => series[index] ?? 0)
          .sort((left, right) => left - right);
        low.push(at(column, 0.05));
        mid.push(at(column, 0.5));
        high.push(at(column, 0.95));
      }
      bands[id] = { low, mid, high };
    }
    const response: RunResponse = { kind: 'band', ticks: runs[0]?.ticks ?? [], series: {}, bands };
    self.postMessage(response);
    return;
  }
  if (request.kind === 'compare') {
    const fiat = one(request.seed, request.ticks, { ...request.sliders, 'regime.type': 'fiat' });
    const bitcoin = one(request.seed, request.ticks, {
      ...request.sliders,
      'regime.type': 'bitcoin',
    });
    const response: RunResponse = {
      kind: 'compare',
      ticks: fiat.ticks,
      series: {
        ...fiat.series,
        priceLevelBitcoin: bitcoin.series['priceLevel'] ?? [],
        meanWellbeingBitcoin: bitcoin.series['meanWellbeing'] ?? [],
      },
    };
    self.postMessage(response);
    return;
  }
  self.postMessage({ kind: 'run', ...one(request.seed, request.ticks, request.sliders) });
};

function one(
  seed: number,
  ticks: number,
  sliders: Record<string, number | string>,
): { ticks: number[]; series: Record<string, number[]> } {
  const result = simulate(loadScenario({ name: 'browser', seed, ticks, sliders }));
  const series: Record<string, number[]> = {};
  for (const id of CHARTS) {
    series[id] = result.metrics.series[id].map((value) => value ?? 0);
  }
  return { ticks: result.metrics.ticks, series };
}

function at(sorted: number[], fraction: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const position = fraction * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}
