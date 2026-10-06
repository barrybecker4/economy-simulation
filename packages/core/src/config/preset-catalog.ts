import type { SliderGroup } from './builders.js';
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
