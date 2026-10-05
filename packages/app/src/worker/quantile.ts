import type { PercentileBand } from './protocol.js';

const LOW = 0.05;
const MID = 0.5;
const HIGH = 0.95;

/** Linear percentile of a sorted sample. `fraction` is 0 at the minimum and 1 at the maximum. */
export function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) {
    throw new Error('Cannot take a percentile of an empty sample');
  }
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new Error('Percentile fraction must be between 0 and 1');
  }
  const position = fraction * (sorted.length - 1);
  return blend(at(sorted, Math.floor(position)), at(sorted, Math.ceil(position)), position);
}

export function seriesBand(samples: readonly (readonly number[])[]): PercentileBand {
  const length = sharedLength(samples);
  const low: number[] = [];
  const mid: number[] = [];
  const high: number[] = [];
  for (let index = 0; index < length; index += 1) {
    const column = sortedColumn(samples, index);
    low.push(percentile(column, LOW));
    mid.push(percentile(column, MID));
    high.push(percentile(column, HIGH));
  }
  return { low, mid, high };
}

function blend(low: number, high: number, position: number): number {
  const weight = position - Math.floor(position);
  return low * (1 - weight) + high * weight;
}

function at(sorted: readonly number[], index: number): number {
  const value = sorted[index];
  if (value === undefined) {
    throw new Error('Percentile index is out of range');
  }
  return value;
}

function sharedLength(samples: readonly (readonly number[])[]): number {
  const first = samples[0];
  if (first === undefined) {
    throw new Error('A band needs at least one run');
  }
  for (const series of samples) {
    if (series.length !== first.length) {
      throw new Error('Band runs have different lengths');
    }
  }
  return first.length;
}

function sortedColumn(samples: readonly (readonly number[])[], index: number): number[] {
  return samples.map((series) => columnValue(series, index)).sort((left, right) => left - right);
}

function columnValue(series: readonly number[], index: number): number {
  const value = series[index];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Missing band value at ${index}`);
  }
  return value;
}
