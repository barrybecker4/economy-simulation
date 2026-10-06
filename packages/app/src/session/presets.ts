import {
  applyCategoryOption,
  categoryForGroup,
  matchingCategoryOption,
  PRESET_CATEGORIES,
  type PresetCategory,
} from '../../../core/src/config/presets.js';

export { categoryForGroup, PRESET_CATEGORIES };
export type { PresetCategory };

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

export function matchingCategories(
  overrides: Readonly<Record<string, number | string>>,
): Record<string, string | null> {
  const match: Record<string, string | null> = {};
  for (const category of PRESET_CATEGORIES) {
    match[category.id] = matchingCategoryOption(category.id, overrides);
  }
  return match;
}

export function categoryTipItems(
  category: PresetCategory,
): readonly { name: string; detail: string }[] {
  return category.options.map((option) => ({
    name: option.name,
    detail: option.detail,
  }));
}
