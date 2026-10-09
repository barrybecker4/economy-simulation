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
      'How the fiat central bank sets the policy rate, and what share of new government bonds it pays for with new reserves. Bitcoin and hybrid ignore these settings.',
    group: 'centralBank',
    fiatOnly: true,
    owned: [
      'centralBank.inflationTarget',
      'centralBank.inflationWeight',
      'centralBank.outputWeight',
      'centralBank.bondPurchaseShare',
      'centralBank.rateSmoothing',
      'bank.reserveRequirement',
    ],
    options: [
      {
        id: 'hawkish',
        name: 'Hawkish',
        detail:
          'Inflation weight 2.5, output weight 0.2, bond purchase share 0. Other central-bank sliders stay at their defaults.',
        values: {
          'centralBank.inflationTarget': 0.02,
          'centralBank.inflationWeight': 2.5,
          'centralBank.outputWeight': 0.2,
          'centralBank.bondPurchaseShare': 0,
          'bank.reserveRequirement': 0.1,
          'centralBank.rateSmoothing': 0.5,
        },
      },
      {
        id: 'balanced',
        name: 'Balanced',
        detail:
          'Inflation weight 1.5, output weight 1, bond purchase share 0.25, and every other owned slider at its default.',
        values: {
          'centralBank.inflationTarget': 0.02,
          'centralBank.inflationWeight': 1.5,
          'centralBank.outputWeight': 1,
          'centralBank.bondPurchaseShare': 0.25,
          'bank.reserveRequirement': 0.1,
          'centralBank.rateSmoothing': 0.5,
        },
      },
      {
        id: 'employment-leaning',
        name: 'Employment-leaning',
        detail:
          'Output weight 1.2, inflation weight left at 1.5, bond purchase share left at 0.25.',
        values: {
          'centralBank.inflationTarget': 0.02,
          'centralBank.inflationWeight': 1.5,
          'centralBank.outputWeight': 1.2,
          'centralBank.bondPurchaseShare': 0.25,
          'bank.reserveRequirement': 0.1,
          'centralBank.rateSmoothing': 0.5,
        },
      },
      {
        id: 'monetizing',
        name: 'Monetizing',
        detail:
          'Bond purchase share 0.5. Inflation target, inflation weight, output weight, and the reserve requirement stay at their defaults.',
        values: {
          'centralBank.inflationTarget': 0.02,
          'centralBank.inflationWeight': 1.5,
          'centralBank.outputWeight': 1,
          'centralBank.bondPurchaseShare': 0.5,
          'bank.reserveRequirement': 0.1,
          'centralBank.rateSmoothing': 0.5,
        },
      },
    ],
  },
  {
    id: 'publicFinance',
    name: 'Public finance',
    detail:
      'Income tax, government purchases, the UBI grant, the fiscal stabilizer, and the treasury buffer.',
    group: 'publicFinance',
    owned: [
      'tax.incomeRate',
      'government.spendingShareOfGDP',
      'government.ubiShare',
      'government.stabilizer',
      'government.treasuryBufferMonths',
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
          'government.treasuryBufferMonths': 1,
        },
      },
      {
        id: 'moderate',
        name: 'Moderate',
        detail:
          'Tax and spending at 20 percent, UBI at 25 percent of AI GDP, stabilizer at 1. This is the registry default.',
        values: {
          'tax.incomeRate': 0.2,
          'government.spendingShareOfGDP': 0.2,
          'government.ubiShare': 0.25,
          'government.stabilizer': 1,
          'government.treasuryBufferMonths': 1,
        },
      },
      {
        id: 'large',
        name: 'Large',
        detail: 'Tax and spending at 35 percent, UBI at 25 percent of AI GDP, stabilizer at 1.',
        values: {
          'tax.incomeRate': 0.35,
          'government.spendingShareOfGDP': 0.35,
          'government.ubiShare': 0.25,
          'government.stabilizer': 1,
          'government.treasuryBufferMonths': 1,
        },
      },
      {
        id: 'deficit-spending',
        name: 'Deficit spending',
        detail:
          'Tax at 20 percent, spending at 35 percent, UBI at 25 percent of AI GDP, stabilizer at 1.5.',
        values: {
          'tax.incomeRate': 0.2,
          'government.spendingShareOfGDP': 0.35,
          'government.ubiShare': 0.25,
          'government.stabilizer': 1.5,
          'government.treasuryBufferMonths': 1,
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
        detail:
          'Capital ratio 6 percent, maturity-matched lending, deflation sensitivity 1. This is the registry default.',
        values: {
          'bank.capitalRatio': 0.06,
          'bitcoin.lendingModel': 'maturityMatched',
          'deflation.sensitivity': 1,
        },
      },
      {
        id: 'easy',
        name: 'Easy',
        detail: 'Capital ratio 4 percent, maturity-matched lending, deflation sensitivity 0.',
        values: {
          'bank.capitalRatio': 0.04,
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
          'Start and end automatable shares both 30 percent, so the curve stays put. Bullishness 1, medium adoption timing, and a 70 percent reachable share; robotics would start at year 10 and finish at year 20.',
        values: {
          'ai.bullishness': 1,
          'ai.automatableShareStart': 0.3,
          'ai.automatableShareEnd': 0.3,
          'ai.adoptionMidpointYear': 10,
          'ai.adoptionSteepness': 0.4,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 10,
          'ai.roboticsRampYears': 10,
        },
      },
      {
        id: 'modest',
        name: 'Modest',
        detail:
          'Bullishness 0.35, medium-slow adoption (midpoint year 8, steepness 0.15), and a narrow reach (reachable share 30 percent, robotics from year 15 over 12 years). This is the registry default.',
        values: {
          'ai.bullishness': 0.35,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 8,
          'ai.adoptionSteepness': 0.15,
          'ai.physicalTaskShare': 0.7,
          'ai.roboticsStartYear': 15,
          'ai.roboticsRampYears': 12,
        },
      },
      {
        id: 'substantial',
        name: 'Substantial',
        detail:
          'Bullishness 1, medium adoption (midpoint year 5, steepness 0.4), and typical reach (reachable share 70 percent, robotics from year 8 over 12 years).',
        values: {
          'ai.bullishness': 1,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 5,
          'ai.adoptionSteepness': 0.4,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 8,
          'ai.roboticsRampYears': 12,
        },
      },
      {
        id: 'high',
        name: 'High',
        detail:
          'Bullishness 1.5, fast adoption (midpoint year 3, steepness 1.2), and typical reach. Robotics start at year 4 and finish at year 12.',
        values: {
          'ai.bullishness': 1.5,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 3,
          'ai.adoptionSteepness': 1.2,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 4,
          'ai.roboticsRampYears': 8,
        },
      },
      {
        id: 'extreme',
        name: 'Extreme',
        detail:
          'Bullishness 2, fast adoption (midpoint year 3), and broad reach (reachable share 90 percent, automatable share ends at 99 percent, robotics from year 1 over 4 years).',
        values: {
          'ai.bullishness': 2,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.99,
          'ai.adoptionMidpointYear': 3,
          'ai.adoptionSteepness': 1.2,
          'ai.physicalTaskShare': 0.1,
          'ai.roboticsStartYear': 1,
          'ai.roboticsRampYears': 4,
        },
      },
    ],
  },
];
