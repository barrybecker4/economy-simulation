import { assertSliderValue, listSliders } from './registry.js';
import { scenarioSchema, type ScenarioJson } from './schema.js';
import { DEFAULT_SCENARIO_NAME, DEFAULT_TICKS, MAX_TICKS, REGISTRY_VERSION } from './limits.js';

export interface ScenarioOverrides {
  seed?: number;
  ticks?: number;
  sliders?: Readonly<Record<string, number | string>>;
}

export interface ResolvedConfig {
  name: string;
  seed: number;
  ticks: number;
  registryVersion: number;
  sliders: Readonly<Record<string, number | string>>;
}

export function loadScenario(raw: unknown, overrides: ScenarioOverrides = {}): ResolvedConfig {
  const parsed = scenarioSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`Invalid scenario: ${detail}`);
  }
  return resolveConfig(parsed.data, overrides);
}

export function resolveConfig(
  input: ScenarioJson,
  overrides: ScenarioOverrides = {},
): ResolvedConfig {
  const seed = overrides.seed ?? input.seed;
  if (seed === undefined) {
    throw new Error('Scenario seed is required');
  }
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new Error('Seed must be a non-negative safe integer');
  }
  const ticks = overrides.ticks ?? input.ticks ?? DEFAULT_TICKS;
  if (!Number.isSafeInteger(ticks) || ticks < 1 || ticks > MAX_TICKS) {
    throw new Error(`Ticks must be an integer between 1 and ${MAX_TICKS}`);
  }
  const sliders = defaultSliders();
  applySliders(sliders, input.sliders ?? {});
  applySliders(sliders, overrides.sliders ?? {});
  assertAutomatableShareOrder(sliders);
  return {
    name: input.name ?? DEFAULT_SCENARIO_NAME,
    seed,
    ticks,
    registryVersion: REGISTRY_VERSION,
    sliders: sortSliders(sliders),
  };
}

function defaultSliders(): Record<string, number | string> {
  const sliders: Record<string, number | string> = {};
  for (const slider of listSliders()) {
    sliders[slider.id] = slider.default;
  }
  return sliders;
}

function applySliders(
  target: Record<string, number | string>,
  values: Readonly<Record<string, number | string>>,
): void {
  for (const [id, value] of Object.entries(values)) {
    assertSliderValue(id, value);
    target[id] = value;
  }
}

function assertAutomatableShareOrder(sliders: Readonly<Record<string, number | string>>): void {
  const start = sliders['ai.automatableShareStart'];
  const end = sliders['ai.automatableShareEnd'];
  if (typeof start === 'number' && typeof end === 'number' && end < start) {
    throw new Error(
      'ai.automatableShareEnd must be greater than or equal to ai.automatableShareStart',
    );
  }
}

function sortSliders(
  sliders: Readonly<Record<string, number | string>>,
): Readonly<Record<string, number | string>> {
  const sorted: Record<string, number | string> = {};
  for (const id of Object.keys(sliders).sort()) {
    const value = sliders[id];
    if (value === undefined) {
      throw new Error(`Missing slider ${id}`);
    }
    sorted[id] = value;
  }
  return sorted;
}
