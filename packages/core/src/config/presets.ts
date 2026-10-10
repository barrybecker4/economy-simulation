import type { SliderGroup } from './builders.js';
import { PRESET_CATEGORIES, type CategoryOption, type PresetCategory } from './preset-catalog.js';
import { assertPresetCatalog } from './preset-check.js';
import { assertSliderValue, getSlider } from './registry.js';

export type { CategoryOption, PresetCategory };
export { PRESET_CATEGORIES };

assertPresetCatalog(PRESET_CATEGORIES);

export function categoryById(id: string): PresetCategory {
  const category = PRESET_CATEGORIES.find((item) => item.id === id);
  if (category === undefined) {
    throw new Error(`Unknown preset category ${id}`);
  }
  return category;
}

export function categoryForGroup(group: SliderGroup): PresetCategory | undefined {
  return PRESET_CATEGORIES.find((item) => item.group === group);
}

export function optionById(categoryId: string, optionId: string): CategoryOption {
  const category = categoryById(categoryId);
  const option = category.options.find((item) => item.id === optionId);
  if (option === undefined) {
    throw new Error(`Unknown option ${optionId} in category ${categoryId}`);
  }
  return option;
}

/**
 * Replaces the values owned by one category. Other overrides stay.
 * Values equal to the registry default are omitted from the result.
 */
export function applyCategoryOption(
  categoryId: string,
  optionId: string,
  overrides: Readonly<Record<string, number | string>>,
): Record<string, number | string> {
  const category = categoryById(categoryId);
  const option = optionById(categoryId, optionId);
  const next: Record<string, number | string> = {};
  for (const [id, value] of Object.entries(overrides)) {
    if (!category.owned.includes(id)) {
      next[id] = value;
    }
  }
  for (const id of category.owned) {
    const value = option.values[id];
    if (value === undefined) {
      throw new Error(`Option ${optionId} is missing ${id}`);
    }
    assertSliderValue(id, value);
    const slider = getSlider(id);
    if (String(value) !== String(slider.default)) {
      next[id] = value;
    }
  }
  return next;
}

/** Which option matches the current overrides for one category, or null for Custom. */
export function matchingCategoryOption(
  categoryId: string,
  overrides: Readonly<Record<string, number | string>>,
): string | null {
  const category = categoryById(categoryId);
  for (const option of category.options) {
    if (optionMatches(category, option, overrides)) {
      return option.id;
    }
  }
  return null;
}

/** Slider overrides for a composition of category options. Defaults are omitted. */
export function composeCategoryOptions(
  choices: Readonly<Record<string, string>>,
): Record<string, number | string> {
  let overrides: Record<string, number | string> = {};
  for (const category of PRESET_CATEGORIES) {
    const optionId = choices[category.id];
    if (optionId === undefined) {
      continue;
    }
    overrides = applyCategoryOption(category.id, optionId, overrides);
  }
  return overrides;
}

export interface ScenarioWorld {
  id: string;
  name: string;
  detail: string;
  regime: string;
  choices: Readonly<Record<string, string>>;
}

/** Named scenario worlds: one regime and one option in every category. */
export const SCENARIO_WORLDS: readonly ScenarioWorld[] = [
  {
    id: 'monetized-dividend',
    name: 'Monetized dividend',
    detail:
      'Fiat; monetizing central bank; AI dividend; moderate credit; extreme AI. The central bank buys half of new bonds while the grant rises with adoption.',
    regime: 'fiat',
    choices: {
      centralBank: 'monetizing',
      publicFinance: 'ai-dividend',
      credit: 'moderate',
      aiBullishness: 'extreme',
    },
  },
  {
    id: 'hawkish-dividend',
    name: 'Hawkish dividend',
    detail:
      'Fiat; hawkish central bank; AI dividend; moderate credit; extreme AI. Same grant as Monetized dividend; the central bank fights inflation and leaves bonds with banks.',
    regime: 'fiat',
    choices: {
      centralBank: 'hawkish',
      publicFinance: 'ai-dividend',
      credit: 'moderate',
      aiBullishness: 'extreme',
    },
  },
  {
    id: 'modest-dividend',
    name: 'Modest dividend',
    detail:
      'Fiat; monetizing central bank; AI dividend; moderate credit; modest AI. Same fiscal and money rule as Monetized dividend; AI stays on the registry default path.',
    regime: 'fiat',
    choices: {
      centralBank: 'monetizing',
      publicFinance: 'ai-dividend',
      credit: 'moderate',
      aiBullishness: 'modest',
    },
  },
  {
    id: 'private-surplus',
    name: 'Private surplus',
    detail:
      'Fiat; hawkish central bank; private surplus; moderate credit; extreme AI. Same AI and rate rule as Hawkish dividend; the household grant is off.',
    regime: 'fiat',
    choices: {
      centralBank: 'hawkish',
      publicFinance: 'private-surplus',
      credit: 'moderate',
      aiBullishness: 'extreme',
    },
  },
  {
    id: 'bitcoin-dividend',
    name: 'Bitcoin dividend',
    detail:
      'Bitcoin; balanced central bank (ignored); AI dividend; moderate credit; extreme AI. Same grant as Hawkish dividend; the regime cannot monetize bonds.',
    regime: 'bitcoin',
    choices: {
      centralBank: 'balanced',
      publicFinance: 'ai-dividend',
      credit: 'moderate',
      aiBullishness: 'extreme',
    },
  },
  {
    id: 'bitcoin-private-surplus',
    name: 'Bitcoin private surplus',
    detail:
      'Bitcoin; balanced central bank (ignored); private surplus; moderate credit; extreme AI. Hard money with no household grant.',
    regime: 'bitcoin',
    choices: {
      centralBank: 'balanced',
      publicFinance: 'private-surplus',
      credit: 'moderate',
      aiBullishness: 'extreme',
    },
  },
];

const WORLD_COMPOSITIONS: Readonly<
  Record<string, { regime: string; choices: Readonly<Record<string, string>> }>
> = Object.fromEntries(
  SCENARIO_WORLDS.map((world) => [world.id, { regime: world.regime, choices: world.choices }]),
);

/** Named CLI scenario files as compositions of category options plus an optional regime. */
export const SCENARIO_COMPOSITIONS: Readonly<
  Record<string, { regime: string; choices: Readonly<Record<string, string>> }>
> = {
  neutral: {
    regime: 'fiat',
    choices: {},
  },
  'no-ai': {
    regime: 'fiat',
    choices: { aiBullishness: 'none' },
  },
  'slow-adoption': {
    regime: 'fiat',
    choices: { aiBullishness: 'modest' },
  },
  'fast-adoption': {
    regime: 'fiat',
    choices: { aiBullishness: 'high' },
  },
  'high-physical': {
    regime: 'fiat',
    choices: { aiBullishness: 'modest' },
  },
  austrian: {
    regime: 'bitcoin',
    choices: { credit: 'tight', publicFinance: 'small' },
  },
  keynesian: {
    regime: 'fiat',
    choices: { publicFinance: 'deficit-spending', centralBank: 'employment-leaning' },
  },
  ...WORLD_COMPOSITIONS,
};

export function worldById(id: string): ScenarioWorld {
  const world = SCENARIO_WORLDS.find((item) => item.id === id);
  if (world === undefined) {
    throw new Error(`Unknown scenario world ${id}`);
  }
  return world;
}

/**
 * Applies every category option for a world. Sliders no category owns stay.
 * Does not write regime.type into overrides; the caller sets the regime.
 */
export function applyScenarioWorld(
  id: string,
  overrides: Readonly<Record<string, number | string>>,
): { regime: string; overrides: Record<string, number | string> } {
  const world = worldById(id);
  let next = { ...overrides };
  for (const category of PRESET_CATEGORIES) {
    const optionId = world.choices[category.id];
    if (optionId === undefined) {
      throw new Error(`World ${id} is missing category ${category.id}`);
    }
    next = applyCategoryOption(category.id, optionId, next);
  }
  return { regime: world.regime, overrides: next };
}

/** Which world matches the regime and every category, or null for Custom. */
export function matchingScenarioWorld(
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): string | null {
  for (const world of SCENARIO_WORLDS) {
    if (world.regime !== regime) {
      continue;
    }
    if (
      PRESET_CATEGORIES.every((category) => {
        const optionId = world.choices[category.id];
        return (
          optionId !== undefined && matchingCategoryOption(category.id, overrides) === optionId
        );
      })
    ) {
      return world.id;
    }
  }
  return null;
}

export function composeScenario(name: string): {
  regime: string;
  sliders: Record<string, number | string>;
} {
  const composition = SCENARIO_COMPOSITIONS[name];
  if (composition === undefined) {
    throw new Error(`Unknown scenario composition ${name}`);
  }
  const sliders = composeCategoryOptions(composition.choices);
  if (composition.regime !== 'fiat') {
    sliders['regime.type'] = composition.regime;
  }
  return { regime: composition.regime, sliders };
}

function optionMatches(
  category: PresetCategory,
  option: CategoryOption,
  overrides: Readonly<Record<string, number | string>>,
): boolean {
  for (const id of category.owned) {
    const expected = option.values[id];
    if (expected === undefined) {
      return false;
    }
    const slider = getSlider(id);
    const current = overrides[id] ?? slider.default;
    if (String(current) !== String(expected)) {
      return false;
    }
  }
  return true;
}
