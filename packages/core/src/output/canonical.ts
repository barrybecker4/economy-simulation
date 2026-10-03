import type { SimulationResult } from '../engine/engine.js';
import { formatCanonicalNumber } from '../money/amount.js';

export interface ResultRecord {
  config: {
    name: string;
    seed: number;
    ticks: number;
    registryVersion: number;
    sliders: Readonly<Record<string, number | string>>;
  };
  unit: SimulationResult['unit'];
  audit: SimulationResult['audit'];
  metrics: SimulationResult['metrics'];
}

export function toResultRecord(result: SimulationResult): ResultRecord {
  return {
    config: {
      name: result.config.name,
      seed: result.config.seed,
      ticks: result.config.ticks,
      registryVersion: result.config.registryVersion,
      sliders: result.config.sliders,
    },
    unit: result.unit,
    audit: result.audit,
    metrics: {
      ticks: result.metrics.ticks,
      series: result.metrics.series,
    },
  };
}

export function simulationToJson(result: SimulationResult): string {
  return `${JSON.stringify(toResultRecord(result), null, 2)}\n`;
}

/** Stable text for hashing. Numbers use a fixed exponential format, and object keys are sorted. */
export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

function canonicalize(value: unknown): unknown {
  if (typeof value === 'number') {
    return formatCanonicalNumber(value);
  }
  if (typeof value === 'string' || typeof value === 'boolean' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = canonicalize(record[key]);
    }
    return sorted;
  }
  throw new Error('Cannot canonicalize value');
}
