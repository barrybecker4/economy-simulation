import type { Slider } from './builders.js';
import { AI_SLIDERS } from './sliders/ai.js';
import { ANNOTATIONS } from './sliders/annotations.js';
import { BEHAVIOR_SLIDERS } from './sliders/behavior.js';
import { GOODS_SLIDERS } from './sliders/goods.js';
import { MACRO_SLIDERS } from './sliders/macro.js';
import { MARKET_SLIDERS } from './sliders/markets.js';
import { SCALE_SLIDERS } from './sliders/scale.js';

export type { EnumSlider, NumberSlider, Slider, SliderGroup, SliderStatus } from './builders.js';

const RAW_SLIDERS: readonly Slider[] = [
  ...BEHAVIOR_SLIDERS,
  ...MACRO_SLIDERS,
  ...GOODS_SLIDERS,
  ...AI_SLIDERS,
  ...SCALE_SLIDERS,
  ...MARKET_SLIDERS,
];

export const SLIDERS: readonly Slider[] = RAW_SLIDERS.map((slider) => {
  const note = ANNOTATIONS[slider.id];
  return note ? { ...slider, ...note } : slider;
});

const SLIDER_BY_ID = new Map<string, Slider>(SLIDERS.map((slider) => [slider.id, slider]));

assertRegistry(SLIDERS);

export function listSliders(): readonly Slider[] {
  return SLIDERS;
}

export function getSlider(id: string): Slider {
  const slider = SLIDER_BY_ID.get(id);
  if (!slider) {
    throw new Error(`Unknown slider ${id}`);
  }
  return slider;
}

export function assertSliderValue(id: string, value: number | string): void {
  const slider = getSlider(id);
  if (slider.kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${id} must be a finite number`);
    }
    if (value < slider.min || value > slider.max) {
      throw new Error(`${id} must be between ${slider.min} and ${slider.max}`);
    }
    return;
  }
  if (typeof value !== 'string' || !slider.options.includes(value)) {
    throw new Error(`${id} must be one of ${slider.options.join(', ')}`);
  }
}

function assertRegistry(sliders: readonly Slider[]): void {
  const seen = new Set<string>();
  for (const slider of sliders) {
    if (seen.has(slider.id)) {
      throw new Error(`Duplicate slider ${slider.id}`);
    }
    seen.add(slider.id);
    if (slider.kind === 'number') {
      if (slider.min > slider.max || slider.default < slider.min || slider.default > slider.max) {
        throw new Error(`Slider ${slider.id} has a default outside its range`);
      }
    } else if (!slider.options.includes(slider.default)) {
      throw new Error(`Slider ${slider.id} default is not an allowed option`);
    }
  }
}
