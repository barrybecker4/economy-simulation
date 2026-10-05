import { assertSliderValue, getSlider } from '../../../core/src/config/registry.js';
import { defaultRegime } from './sliders.js';

export interface PageState {
  seed: number;
  ticks: number;
  regime: string;
  overrides: Record<string, number | string>;
}

export function defaultPage(): PageState {
  return { seed: 1, ticks: 120, regime: defaultRegime(), overrides: {} };
}

export function parsePageState(search: string, defaults: PageState = defaultPage()): PageState {
  const params = singleParams(search);
  return {
    seed: readInteger(
      params.get('seed'),
      'Seed must be a non-negative safe integer',
      defaults.seed,
      (value) => value >= 0,
    ),
    ticks: readInteger(
      params.get('ticks'),
      'Ticks must be a positive integer',
      defaults.ticks,
      (value) => value > 0,
    ),
    regime: readRegime(params.get('regime'), defaults.regime),
    overrides: readOverrides(params),
  };
}

export function pageSearch(state: PageState): string {
  const params = new URLSearchParams();
  params.set('seed', String(state.seed));
  params.set('ticks', String(state.ticks));
  params.set('regime', state.regime);
  for (const id of Object.keys(state.overrides).sort()) {
    params.set(id, String(overrideAt(state.overrides, id)));
  }
  return params.toString();
}

function singleParams(search: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const [key, value] of new URLSearchParams(search)) {
    if (params.has(key)) {
      throw new Error(`Duplicate query parameter ${key}`);
    }
    params.set(key, value);
  }
  return params;
}

function readOverrides(params: Map<string, string>): Record<string, number | string> {
  const overrides: Record<string, number | string> = {};
  for (const [key, raw] of params) {
    if (key === 'seed' || key === 'ticks' || key === 'regime') {
      continue;
    }
    if (key === 'regime.type') {
      throw new Error('Set the regime with the regime parameter');
    }
    const value = overrideValue(key, raw);
    if (value !== null) {
      overrides[key] = value;
    }
  }
  return overrides;
}

function overrideValue(id: string, raw: string): number | string | null {
  const slider = getSlider(id);
  const value = slider.kind === 'number' ? readFinite(id, raw) : raw;
  assertSliderValue(id, value);
  if (String(value) === String(slider.default)) {
    return null;
  }
  return value;
}

function readFinite(id: string, raw: string): number {
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(value)) {
    throw new Error(`${id} must be a finite number`);
  }
  return value;
}

function readInteger(
  raw: string | undefined,
  invalid: string,
  fallback: number,
  accept: (value: number) => boolean,
): number {
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isSafeInteger(value) || !accept(value)) {
    throw new Error(invalid);
  }
  return value;
}

function readRegime(raw: string | undefined, fallback: string): string {
  if (raw === undefined) {
    return fallback;
  }
  assertSliderValue('regime.type', raw);
  return raw;
}

function overrideAt(overrides: Record<string, number | string>, id: string): number | string {
  const value = overrides[id];
  if (value === undefined) {
    throw new Error(`Missing override ${id}`);
  }
  return value;
}
