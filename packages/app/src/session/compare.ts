import type { Slider } from '../../../core/src/config/registry.js';
import { parameterSliders, sliderValue, writeSlider } from './sliders.js';

export interface CompareSide {
  regime: string;
  overrides: Readonly<Record<string, number | string>>;
}

export interface CompareDiff {
  id: string;
  label: string;
  baseline: number | string;
  variant: number | string;
}

/** Scale, scoring, and inert assumptions held fixed while a baseline is pinned. */
const COMPARISON_FRAME = new Set([
  'scale.households',
  'scale.firms',
  'scale.banks',
  'welfare.housingSecurityWeight',
  'welfare.weightInequality',
  'welfare.weightMedianWealth',
  'welfare.weightWellbeing',
  'welfare.weightStability',
  'population.growth',
  'household.trustInBanks',
]);

export function comparisonFrame(id: string): boolean {
  return COMPARISON_FRAME.has(id);
}

/**
 * Rewrites only comparison-frame sliders on the live side to the baseline's
 * resolved values, so a variant cannot change the size or scoring of the run.
 */
export function alignComparisonFrame(
  sliders: readonly Slider[],
  live: CompareSide,
  baseline: CompareSide,
): CompareSide {
  let regime = live.regime;
  let overrides = { ...live.overrides };
  for (const slider of parameterSliders(sliders)) {
    if (!comparisonFrame(slider.id)) {
      continue;
    }
    const next = writeSlider(
      slider,
      String(sliderValue(slider, baseline.regime, baseline.overrides)),
      regime,
      overrides,
    );
    regime = next.regime;
    overrides = next.overrides;
  }
  return { regime, overrides };
}

/** Sliders whose resolved values differ between a pinned baseline and the live variant. */
export function compareDiffs(
  sliders: readonly Slider[],
  baseline: CompareSide,
  variant: CompareSide,
): CompareDiff[] {
  const diffs: CompareDiff[] = [];
  for (const slider of parameterSliders(sliders)) {
    const left = sliderValue(slider, baseline.regime, baseline.overrides);
    const right = sliderValue(slider, variant.regime, variant.overrides);
    if (String(left) === String(right)) {
      continue;
    }
    diffs.push({
      id: slider.id,
      label: slider.label,
      baseline: left,
      variant: right,
    });
  }
  return diffs;
}
