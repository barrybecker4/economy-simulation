import { assertSliderValue, getSlider } from '../../../core/src/config/registry.js';
import { assertSeedCount, MAX_SEEDS, MIN_SEEDS } from './run.js';
import { defaultRegime } from './sliders.js';

export interface PageState {
  seed: number;
  ticks: number;
  seeds: number;
  regime: string;
  overrides: Record<string, number | string>;
}

/** Opening comparison: spending can move prices and output; fiat money growth stays at its default of 1. */
export const MONETARY_OVERRIDES: Readonly<Record<string, number | string>> = {
  'prices.trendWeight': 0.8,
  'production.demandWeight': 1,
  'bank.depositPassThrough': 1,
  'household.realReturnSensitivity': 1,
  'expectations.anchorWeight': 0.5,
  'housing.tenureChoice': 'on',
  'credit.endogenousWeight': 1,
  'credit.leverageStart': 1,
  'bank.capitalRatio': 0.04,
  'household.openingDepositMonths': 12,
  'government.bondRate': 0.02,
};

export function defaultPage(): PageState {
  return {
    seed: 1,
    ticks: 120,
    seeds: 1,
    regime: defaultRegime(),
    overrides: { ...MONETARY_OVERRIDES },
  };
}

export function parsePageState(search: string, defaults: PageState = defaultPage()): PageState {
  const params = singleParams(search);
  if (params.size === 0) {
    return {
      seed: defaults.seed,
      ticks: defaults.ticks,
      seeds: defaults.seeds,
      regime: defaults.regime,
      overrides: { ...defaults.overrides },
    };
  }
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
    seeds: readSeeds(params.get('seeds'), defaults.seeds),
    regime: readRegime(params.get('regime'), defaults.regime),
    overrides: readOverrides(params),
  };
}

export function pageSearch(state: PageState): string {
  const params = new URLSearchParams();
  params.set('seed', String(state.seed));
  params.set('ticks', String(state.ticks));
  if (state.seeds !== 1) {
    params.set('seeds', String(state.seeds));
  }
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
    if (key === 'seed' || key === 'ticks' || key === 'seeds' || key === 'regime') {
      continue;
    }
    // Hosts add private parameters, such as the editor's _ijt cache buster.
    if (key.startsWith('_')) {
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

function readSeeds(raw: string | undefined, fallback: number): number {
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isSafeInteger(value)) {
    throw new Error(`Seeds must be an integer from ${MIN_SEEDS} to ${MAX_SEEDS}`);
  }
  assertSeedCount(value);
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
