import {
  getSlider,
  type EnumSlider,
  type NumberSlider,
  type Slider,
} from '../../../core/src/config/registry.js';

const REGIME_ID = 'regime.type';

export function defaultRegime(): string {
  const slider = getSlider(REGIME_ID);
  if (slider.kind !== 'enum') {
    throw new Error(`${REGIME_ID} must be an enum`);
  }
  return slider.default;
}

export function parameterSliders(sliders: readonly Slider[]): Slider[] {
  return [
    ...sliders.filter((slider) => slider.kind === 'enum'),
    ...sliders.filter((slider) => slider.kind === 'number'),
  ];
}

export function sliderValue(
  slider: Slider,
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): number | string {
  if (slider.id === REGIME_ID) {
    return regime;
  }
  return overrides[slider.id] ?? slider.default;
}

export function resolvedSliders(
  sliders: readonly Slider[],
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): Record<string, number | string> {
  const resolved: Record<string, number | string> = {};
  for (const slider of sliders) {
    resolved[slider.id] = sliderValue(slider, regime, overrides);
  }
  return resolved;
}

export function changedSliders(
  sliders: readonly Slider[],
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): Slider[] {
  return sliders.filter(
    (slider) => String(sliderValue(slider, regime, overrides)) !== String(slider.default),
  );
}

export function sliderStep(slider: Slider): number {
  if (slider.kind !== 'number') {
    throw new Error(`${slider.id} has no numeric step`);
  }
  const step = (slider.max - slider.min) / 100;
  if (!(step > 0)) {
    throw new Error(`${slider.id} needs a positive step`);
  }
  return step;
}

export function writeSlider(
  slider: Slider,
  raw: string,
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): { regime: string; overrides: Record<string, number | string> } {
  if (slider.kind === 'enum') {
    return writeEnum(slider, raw, regime, overrides);
  }
  return { regime, overrides: writeNumber(slider, raw, overrides) };
}

function writeEnum(
  slider: EnumSlider,
  raw: string,
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): { regime: string; overrides: Record<string, number | string> } {
  if (!slider.options.includes(raw)) {
    throw new Error(`${slider.id} must be one of ${slider.options.join(', ')}`);
  }
  if (slider.id === REGIME_ID) {
    return { regime: raw, overrides: { ...overrides } };
  }
  return { regime, overrides: stored(overrides, slider.id, raw, slider.default) };
}

function writeNumber(
  slider: NumberSlider,
  raw: string,
  overrides: Readonly<Record<string, number | string>>,
): Record<string, number | string> {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${slider.id} must be a finite number`);
  }
  return stored(overrides, slider.id, value, slider.default);
}

function stored(
  overrides: Readonly<Record<string, number | string>>,
  id: string,
  value: number | string,
  fallback: number | string,
): Record<string, number | string> {
  if (String(value) === String(fallback)) {
    return omit(overrides, id);
  }
  return { ...overrides, [id]: value };
}

function omit(
  overrides: Readonly<Record<string, number | string>>,
  id: string,
): Record<string, number | string> {
  const next: Record<string, number | string> = {};
  for (const [key, item] of Object.entries(overrides)) {
    if (key !== id) {
      next[key] = item;
    }
  }
  return next;
}
