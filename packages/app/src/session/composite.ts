import type { MetricId } from '../../../core/src/metrics/metrics.js';
import { getSlider } from '../../../core/src/config/registry.js';
import { assertSent, requireSeries } from '../worker/series.js';
import { sliderValue } from './sliders.js';

/** A 6 percent natural rate scores as one minus unemployment. See docs/model.md. */
export const NATURAL_RATE_ANCHOR = 0.06;

const LEVEL_IDS = [
  'giniWealth',
  'medianRealWealth',
  'meanWellbeing',
  'unemployment',
  'naturalUnemployment',
] as const satisfies readonly MetricId[];

for (const id of LEVEL_IDS) {
  assertSent(id);
}

export interface CompositeWeights {
  inequality: number;
  medianWealth: number;
  wellbeing: number;
  stability: number;
}

export interface CompositeLevels {
  giniWealth: number;
  medianRealWealth: number;
  meanWellbeing: number;
  unemployment: number;
  naturalUnemployment: number;
}

export function compositeNote(enabled: boolean, value: number | null): string {
  if (value !== null) {
    return `Composite index: ${value.toFixed(3)}. The weights are assumptions.`;
  }
  if (enabled) {
    return 'Composite index is shown after a single run. The weights are assumptions.';
  }
  return 'Composite index is off. Move a welfare weight to turn it on. Those weights are assumptions.';
}

export function compositeEnabled(weights: CompositeWeights): boolean {
  return (
    weights.inequality !== 0 ||
    weights.medianWealth !== 0 ||
    weights.wellbeing !== 0 ||
    weights.stability !== 0
  );
}

export function stabilityScore(unemployment: number, naturalUnemployment: number): number {
  const raw = 1 - unemployment + naturalUnemployment - NATURAL_RATE_ANCHOR;
  return Math.min(1, Math.max(0, raw));
}

export function compositeIndex(weights: CompositeWeights, levels: CompositeLevels): number {
  return (
    weights.inequality * (1 - levels.giniWealth) +
    weights.medianWealth * levels.medianRealWealth +
    weights.wellbeing * levels.meanWellbeing +
    weights.stability * stabilityScore(levels.unemployment, levels.naturalUnemployment)
  );
}

export function compositeWeights(
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): CompositeWeights {
  return {
    inequality: numericSlider('welfare.weightInequality', regime, overrides),
    medianWealth: numericSlider('welfare.weightMedianWealth', regime, overrides),
    wellbeing: numericSlider('welfare.weightWellbeing', regime, overrides),
    stability: numericSlider('welfare.weightStability', regime, overrides),
  };
}

export function levelsFrom(series: Record<string, number[]>): CompositeLevels {
  return {
    giniWealth: lastSample(requireSeries(series, 'giniWealth'), 'giniWealth'),
    medianRealWealth: lastSample(requireSeries(series, 'medianRealWealth'), 'medianRealWealth'),
    meanWellbeing: lastSample(requireSeries(series, 'meanWellbeing'), 'meanWellbeing'),
    unemployment: lastSample(requireSeries(series, 'unemployment'), 'unemployment'),
    naturalUnemployment: lastSample(
      requireSeries(series, 'naturalUnemployment'),
      'naturalUnemployment',
    ),
  };
}

function numericSlider(
  id: string,
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): number {
  const value = sliderValue(getSlider(id), regime, overrides);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${id} must be a finite number`);
  }
  return value;
}

function lastSample(series: readonly number[], id: string): number {
  const value = series[series.length - 1];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Missing last value for ${id}`);
  }
  return value;
}
