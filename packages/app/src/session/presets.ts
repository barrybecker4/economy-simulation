import {
  applyCategoryOption,
  applyScenarioWorld,
  categoryForGroup,
  matchingCategoryOption,
  matchingScenarioWorld,
  PRESET_CATEGORIES,
  SCENARIO_WORLDS,
  type PresetCategory,
  type ScenarioWorld,
} from '../../../core/src/config/presets.js';

export { categoryForGroup, PRESET_CATEGORIES, SCENARIO_WORLDS };
export type { PresetCategory, ScenarioWorld };

export function applyCategory(
  categoryId: string,
  optionId: string,
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): { regime: string; overrides: Record<string, number | string> } {
  return {
    regime,
    overrides: applyCategoryOption(categoryId, optionId, overrides),
  };
}

export function applyWorld(
  worldId: string,
  overrides: Readonly<Record<string, number | string>>,
): { regime: string; overrides: Record<string, number | string> } {
  return applyScenarioWorld(worldId, overrides);
}

export function matchingCategories(
  overrides: Readonly<Record<string, number | string>>,
): Record<string, string | null> {
  const match: Record<string, string | null> = {};
  for (const category of PRESET_CATEGORIES) {
    match[category.id] = matchingCategoryOption(category.id, overrides);
  }
  return match;
}

export function matchingWorld(
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): string | null {
  return matchingScenarioWorld(regime, overrides);
}

export function categoryTipItems(
  category: PresetCategory,
): readonly { name: string; detail: string }[] {
  return category.options.map((option) => ({
    name: option.name,
    detail: option.detail,
  }));
}

export function worldTipItems(): readonly { name: string; detail: string }[] {
  return SCENARIO_WORLDS.map((world) => ({
    name: world.name,
    detail: world.detail,
  }));
}
