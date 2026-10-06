import { dashboardMetricIds } from '../dashboard/catalog.js';
import type { BandRunResult, RunSuccess } from './protocol.js';

/** Series the worker copies out of a run. Derived from the dashboard catalog. */
export const CHART_METRICS = dashboardMetricIds();

export function requireSeries(series: Record<string, number[]>, id: string): number[] {
  const values = series[id];
  if (values === undefined) {
    throw new Error(`Missing series ${id}`);
  }
  return values;
}

/** Median of a five-seed band, otherwise the single series. */
export function readSeries(result: RunSuccess, id: string): number[] {
  if (result.kind === 'band') {
    return bandMid(result, id);
  }
  return requireSeries(result.series, id);
}

export function metricAt(result: RunSuccess, id: string, index: number): number {
  const value = readSeries(result, id)[index];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Missing ${id} at month ${index}`);
  }
  return value;
}

function bandMid(result: BandRunResult, id: string): number[] {
  const band = result.bands[id];
  if (band === undefined) {
    throw new Error(`Missing band ${id}`);
  }
  return band.mid;
}

export function finiteMetric(values: readonly (number | null)[], id: string): number[] {
  return values.map((value, index) => finiteAt(value, id, index));
}

function finiteAt(value: number | null, id: string, index: number): number {
  if (value === null || !Number.isFinite(value)) {
    throw new Error(`Metric ${id} is missing at index ${index}`);
  }
  return value;
}
