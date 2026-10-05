import { loadScenario } from '../../core/src/config/load.js';
import { simulate } from '../../core/src/sim/simulate.js';
import type { MetricId } from '../../core/src/metrics/metrics.js';
import type { RunRequest, RunSuccess } from './worker-protocol.js';

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
  'naturalUnemployment',
  'interestRate',
  'creditToGdp',
  'ubiOutlay',
  'tasksAutomated',
  'aiShareOfAgents',
  'aiShareOfOutput',
  'giniWealth',
  'medianRealWealth',
] as const satisfies readonly MetricId[];

export function handleRequest(
  request: RunRequest,
  onTick?: (completed: number, total: number) => void,
): RunSuccess {
  const total = simulationCount(request) * request.ticks;
  let offset = 0;
  const report =
    onTick === undefined
      ? undefined
      : (completed: number) => {
          onTick(offset + completed, total);
        };
  const step = (seed: number, sliders: Record<string, number | string>) => {
    const result = one(seed, request.ticks, sliders, report);
    offset += request.ticks;
    return result;
  };

  if (request.kind === 'band') {
    const seeds = request.seeds ?? [request.seed];
    const runs = seeds.map((seed) => step(seed, request.sliders));
    const bands: NonNullable<RunSuccess['bands']> = {};
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
    return { kind: 'band', ticks: runs[0]?.ticks ?? [], series: {}, bands };
  }
  if (request.kind === 'compare') {
    const fiat = step(request.seed, { ...request.sliders, 'regime.type': 'fiat' });
    const bitcoin = step(request.seed, { ...request.sliders, 'regime.type': 'bitcoin' });
    return {
      kind: 'compare',
      ticks: fiat.ticks,
      series: {
        ...fiat.series,
        priceLevelBitcoin: bitcoin.series['priceLevel'] ?? [],
        meanWellbeingBitcoin: bitcoin.series['meanWellbeing'] ?? [],
      },
    };
  }
  return { kind: 'run', ...step(request.seed, request.sliders) };
}

function simulationCount(request: RunRequest): number {
  if (request.kind === 'band') {
    return (request.seeds ?? [request.seed]).length;
  }
  if (request.kind === 'compare') {
    return 2;
  }
  return 1;
}

function one(
  seed: number,
  ticks: number,
  sliders: Record<string, number | string>,
  report?: (completed: number) => void,
): { ticks: number[]; series: Record<string, number[]> } {
  const result = simulate(
    loadScenario({ name: 'browser', seed, ticks, sliders }),
    null,
    report === undefined ? undefined : (completed) => report(completed),
  );
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
