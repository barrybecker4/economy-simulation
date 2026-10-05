import type { Slider } from '../../../core/src/config/registry.js';
import { parameterSliders, sliderValue } from './sliders.js';

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
