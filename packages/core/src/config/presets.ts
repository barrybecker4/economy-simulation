import type { SliderGroup } from './builders.js';
import { assertSliderValue, getSlider } from './registry.js';

export interface CategoryOption {
  id: string;
  name: string;
  detail: string;
  values: Readonly<Record<string, number | string>>;
}

export interface PresetCategory {
  id: string;
  name: string;
  detail: string;
  /** Panel group that hosts this category's preset select. */
  group: SliderGroup;
  /** Slider ids this category owns. Choosing an option rewrites only these. */
  owned: readonly string[];
  options: readonly CategoryOption[];
  /** When true the UI disables the select unless the regime is fiat. */
  fiatOnly?: boolean;
}

const AI_OWNED = [
  'ai.bullishness',
  'ai.automatableShareStart',
  'ai.automatableShareEnd',
  'ai.adoptionMidpointYear',
  'ai.adoptionSteepness',
  'ai.physicalTaskShare',
  'ai.roboticsStartYear',
  'ai.roboticsRampYears',
] as const;

export const PRESET_CATEGORIES: readonly PresetCategory[] = [
  {
    id: 'centralBank',
    name: 'Central bank',
    detail:
      'How hard the fiat policy rate reacts to inflation and unemployment. Bitcoin and hybrid ignore these settings.',
    group: 'centralBank',
    fiatOnly: true,
    owned: [
      'centralBank.inflationTarget',
      'centralBank.inflationWeight',
      'centralBank.outputWeight',
      'centralBank.bondPurchaseShare',
      'bank.reserveRequirement',
    ],
    options: [
      {
        id: 'hawkish',
        name: 'Hawkish',
        detail:
          'Inflation weight 2.5, output weight 0.2. Other central-bank sliders stay at their defaults.',
        values: {
          'centralBank.inflationTarget': 0.02,
          'centralBank.inflationWeight': 2.5,
          'centralBank.outputWeight': 0.2,
          'centralBank.bondPurchaseShare': 0,
          'bank.reserveRequirement': 0.1,
        },
      },
      {
        id: 'balanced',
        name: 'Balanced',
        detail:
          'Inflation weight 1.5, output weight 0.5, and every other owned slider at its default.',
        values: {
          'centralBank.inflationTarget': 0.02,
          'centralBank.inflationWeight': 1.5,
          'centralBank.outputWeight': 0.5,
          'centralBank.bondPurchaseShare': 0,
          'bank.reserveRequirement': 0.1,
        },
      },
      {
        id: 'employment-leaning',
        name: 'Employment-leaning',
        detail:
          'Output weight 1.2, inflation weight left at 1.5. Other owned sliders stay at their defaults.',
        values: {
          'centralBank.inflationTarget': 0.02,
          'centralBank.inflationWeight': 1.5,
          'centralBank.outputWeight': 1.2,
          'centralBank.bondPurchaseShare': 0,
          'bank.reserveRequirement': 0.1,
        },
      },
    ],
  },
  {
    id: 'publicFinance',
    name: 'Public finance',
    detail: 'Income tax, government purchases, the UBI grant, and the fiscal stabilizer.',
    group: 'publicFinance',
    owned: [
      'tax.incomeRate',
      'government.spendingShareOfGDP',
      'government.ubiShare',
      'government.stabilizer',
    ],
    options: [
      {
        id: 'small',
        name: 'Small',
        detail: 'Tax and spending at 10 percent, UBI off, stabilizer off.',
        values: {
          'tax.incomeRate': 0.1,
          'government.spendingShareOfGDP': 0.1,
          'government.ubiShare': 0,
          'government.stabilizer': 0,
        },
      },
      {
        id: 'moderate',
        name: 'Moderate',
        detail: 'Tax and spending at 20 percent, UBI at 25 percent of AI GDP, stabilizer off.',
        values: {
          'tax.incomeRate': 0.2,
          'government.spendingShareOfGDP': 0.2,
          'government.ubiShare': 0.25,
          'government.stabilizer': 0,
        },
      },
      {
        id: 'large',
        name: 'Large',
        detail: 'Tax and spending at 35 percent, UBI at 25 percent of AI GDP, stabilizer off.',
        values: {
          'tax.incomeRate': 0.35,
          'government.spendingShareOfGDP': 0.35,
          'government.ubiShare': 0.25,
          'government.stabilizer': 0,
        },
      },
      {
        id: 'deficit-spending',
        name: 'Deficit spending',
        detail:
          'Tax at 20 percent, spending at 35 percent, UBI at 25 percent of AI GDP, stabilizer at 1.',
        values: {
          'tax.incomeRate': 0.2,
          'government.spendingShareOfGDP': 0.35,
          'government.ubiShare': 0.25,
          'government.stabilizer': 1,
        },
      },
    ],
  },
  {
    id: 'credit',
    name: 'Credit',
    detail: 'Bank capital, the bitcoin lending model, and deflation sensitivity.',
    group: 'credit',
    owned: ['bank.capitalRatio', 'bitcoin.lendingModel', 'deflation.sensitivity'],
    options: [
      {
        id: 'tight',
        name: 'Tight',
        detail: 'Capital ratio 16 percent, full-reserve lending, deflation sensitivity 2.',
        values: {
          'bank.capitalRatio': 0.16,
          'bitcoin.lendingModel': 'fullReserve',
          'deflation.sensitivity': 2,
        },
      },
      {
        id: 'moderate',
        name: 'Moderate',
        detail: 'Capital ratio 8 percent, maturity-matched lending, deflation sensitivity 1.',
        values: {
          'bank.capitalRatio': 0.08,
          'bitcoin.lendingModel': 'maturityMatched',
          'deflation.sensitivity': 1,
        },
      },
      {
        id: 'easy',
        name: 'Easy',
        detail: 'Capital ratio 6 percent, maturity-matched lending, deflation sensitivity 0.',
        values: {
          'bank.capitalRatio': 0.06,
          'bitcoin.lendingModel': 'maturityMatched',
          'deflation.sensitivity': 0,
        },
      },
    ],
  },
  {
    id: 'aiBullishness',
    name: 'AI bullishness',
    detail:
      'How large, how soon, and how widely AI raises capacity: the productivity gain, the adoption curve, and the physical-task ceiling.',
    group: 'ai',
    owned: AI_OWNED,
    options: [
      {
        id: 'none',
        name: 'None',
        detail:
          'Start and end automatable shares both 30 percent, so the curve stays put. Bullishness and reach stay at their defaults.',
        values: {
          'ai.bullishness': 1,
          'ai.automatableShareStart': 0.3,
          'ai.automatableShareEnd': 0.3,
          'ai.adoptionMidpointYear': 15,
          'ai.adoptionSteepness': 0.4,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 5,
          'ai.roboticsRampYears': 8,
        },
      },
      {
        id: 'modest',
        name: 'Modest',
        detail:
          'Bullishness 0, slow adoption (midpoint year 30, steepness 0.15), and a narrow reach (physical share 70 percent, robotics start year 50).',
        values: {
          'ai.bullishness': 0,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 30,
          'ai.adoptionSteepness': 0.15,
          'ai.physicalTaskShare': 0.7,
          'ai.roboticsStartYear': 50,
          'ai.roboticsRampYears': 8,
        },
      },
      {
        id: 'substantial',
        name: 'Substantial',
        detail:
          'Bullishness 1, medium adoption (midpoint year 15, steepness 0.4), and typical reach (physical share 30 percent, robotics from year 5 over 8 years).',
        values: {
          'ai.bullishness': 1,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 15,
          'ai.adoptionSteepness': 0.4,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 5,
          'ai.roboticsRampYears': 8,
        },
      },
      {
        id: 'high',
        name: 'High',
        detail:
          'Bullishness 1.5, fast adoption (midpoint year 5, steepness 1.2), and typical reach.',
        values: {
          'ai.bullishness': 1.5,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 5,
          'ai.adoptionSteepness': 1.2,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 5,
          'ai.roboticsRampYears': 8,
        },
      },
      {
        id: 'extreme',
        name: 'Extreme',
        detail:
          'Bullishness 2, fast adoption, and broad reach (physical share 10 percent, robotics from year 0 over 4 years).',
        values: {
          'ai.bullishness': 2,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 5,
          'ai.adoptionSteepness': 1.2,
          'ai.physicalTaskShare': 0.1,
          'ai.roboticsStartYear': 0,
          'ai.roboticsRampYears': 4,
        },
      },
    ],
  },
];

assertCatalog(PRESET_CATEGORIES);

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

function assertCatalog(categories: readonly PresetCategory[]): void {
  const seenIds = new Set<string>();
  const owned = new Set<string>();
  const groups = new Set<SliderGroup>();
  for (const category of categories) {
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
    for (const id of category.owned) {
      if (owned.has(id)) {
        throw new Error(`Slider ${id} is owned by more than one category`);
      }
      owned.add(id);
      getSlider(id);
    }
    const defaults = category.options.filter((option) =>
      category.owned.every((id) => String(option.values[id]) === String(getSlider(id).default)),
    );
    if (defaults.length !== 1) {
      throw new Error(
        `Category ${category.id} needs exactly one all-default option, found ${defaults.length}`,
      );
    }
  }
}
