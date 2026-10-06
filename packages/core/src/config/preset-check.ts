import type { SliderGroup } from './builders.js';
import type { CategoryOption, PresetCategory } from './preset-catalog.js';
import { assertSliderValue, getSlider } from './registry.js';

export function assertPresetCatalog(categories: readonly PresetCategory[]): void {
  const seenIds = new Set<string>();
  const owned = new Set<string>();
  const groups = new Set<SliderGroup>();
  for (const category of categories) {
    assertCategory(category, seenIds, groups, owned);
  }
}

function assertCategory(
  category: PresetCategory,
  seenIds: Set<string>,
  groups: Set<SliderGroup>,
  owned: Set<string>,
): void {
  if (seenIds.has(category.id)) {
    throw new Error(`Duplicate preset category ${category.id}`);
  }
  seenIds.add(category.id);
  if (groups.has(category.group)) {
    throw new Error(`Two categories claim panel group ${category.group}`);
  }
  groups.add(category.group);
  if (category.options.length === 0) {
    throw new Error(`Category ${category.id} has no options`);
  }
  const optionIds = new Set<string>();
  for (const option of category.options) {
    assertOption(category, option, optionIds);
  }
  assertOwnedSliders(category, owned);
  const defaults = category.options.filter((option) =>
    category.owned.every((id) => String(option.values[id]) === String(getSlider(id).default)),
  );
  if (defaults.length !== 1) {
    throw new Error(
      `Category ${category.id} needs exactly one all-default option, found ${defaults.length}`,
    );
  }
}

function assertOption(
  category: PresetCategory,
  option: CategoryOption,
  optionIds: Set<string>,
): void {
  if (optionIds.has(option.id)) {
    throw new Error(`Duplicate option ${option.id} in ${category.id}`);
  }
  optionIds.add(option.id);
  for (const id of category.owned) {
    if (!(id in option.values)) {
      throw new Error(`Option ${category.id}/${option.id} is missing ${id}`);
    }
  }
  for (const id of Object.keys(option.values)) {
    if (!category.owned.includes(id)) {
      throw new Error(`Option ${category.id}/${option.id} sets unowned ${id}`);
    }
    const value = option.values[id];
    if (value === undefined) {
      throw new Error(`Option ${category.id}/${option.id} is missing ${id}`);
    }
    assertSliderValue(id, value);
  }
}

function assertOwnedSliders(category: PresetCategory, owned: Set<string>): void {
  for (const id of category.owned) {
    if (owned.has(id)) {
      throw new Error(`Slider ${id} is owned by more than one category`);
    }
    owned.add(id);
    getSlider(id);
  }
}
