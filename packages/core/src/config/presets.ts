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
};

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
