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
  'ai.laborReplacement',
  'ai.automatableShareStart',
  'ai.automatableShareEnd',
  'ai.adoptionMidpointYear',
  'ai.adoptionSteepness',
  'ai.computeCostDeclineRate',
  'ai.physicalTaskShare',
  'ai.roboticsStartYear',
  'ai.roboticsRampYears',
  'agent.energyStepMonth',
  'agent.energyStepSize',
  'agent.costHalvingMonths',
  'agent.capabilityCeiling',
  'agent.subagentCeiling',
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
        id: 'ai-dividend',
        name: 'AI dividend',
        detail:
          'Tax at 35 percent, spending at 20 percent, UBI at 75 percent of AI GDP, stabilizer at 1. The grant phases in with AI adoption.',
        values: {
          'tax.incomeRate': 0.35,
          'government.spendingShareOfGDP': 0.2,
          'government.ubiShare': 0.75,
          'government.stabilizer': 1,
          'government.treasuryBufferMonths': 1,
        },
      },
      {
        id: 'private-surplus',
        name: 'Private surplus',
        detail:
          'Tax and spending at 20 percent, UBI off, stabilizer at 1. Purchases match Moderate; the grant does not.',
        values: {
          'tax.incomeRate': 0.2,
          'government.spendingShareOfGDP': 0.2,
          'government.ubiShare': 0,
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
      'How large, how soon, and how widely AI raises capacity: the productivity gain, labor replacement, the adoption curve, agent swarms, and the physical-task ceiling.',
    group: 'ai',
    owned: AI_OWNED,
    options: [
      {
        id: 'none',
        name: 'None',
        detail:
          'Start and end automatable shares both 30 percent, so the curve stays put and AI does not change production, hiring, or ownership. Medium adoption timing and a 70 percent reachable share are unused while the curve is flat; robotics would start at year 10 and finish at year 20. No labor replacement, no energy cost step, and one bot per ledger agent.',
        values: {
          'ai.bullishness': 1,
          'ai.laborReplacement': 0,
          'ai.automatableShareStart': 0.3,
          'ai.automatableShareEnd': 0.3,
          'ai.adoptionMidpointYear': 10,
          'ai.adoptionSteepness': 0.4,
          'ai.computeCostDeclineRate': 0.3,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 10,
          'ai.roboticsRampYears': 10,
          'agent.energyStepMonth': 120,
          'agent.energyStepSize': 0,
          'agent.costHalvingMonths': 24,
          'agent.capabilityCeiling': 1,
          'agent.subagentCeiling': 1,
        },
      },
      {
        id: 'modest',
        name: 'Modest',
        detail:
          'Bullishness 0.35, medium-slow adoption (midpoint year 8, steepness 0.15), and a narrow reach (reachable share 30 percent, robotics from year 15 over 12 years). No labor replacement, no energy cost step, and one bot per ledger agent. This is the registry default.',
        values: {
          'ai.bullishness': 0.35,
          'ai.laborReplacement': 0,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 8,
          'ai.adoptionSteepness': 0.15,
          'ai.computeCostDeclineRate': 0.3,
          'ai.physicalTaskShare': 0.7,
          'ai.roboticsStartYear': 15,
          'ai.roboticsRampYears': 12,
          'agent.energyStepMonth': 120,
          'agent.energyStepSize': 0,
          'agent.costHalvingMonths': 24,
          'agent.capabilityCeiling': 1,
          'agent.subagentCeiling': 1,
        },
      },
      {
        id: 'substantial',
        name: 'Substantial',
        detail:
          'Bullishness 1, labor replacement 0.35, medium adoption (midpoint year 5, steepness 0.4), and typical reach (reachable share 70 percent, robotics from year 8 over 12 years). Agent compute cost halves again from an energy breakthrough at month 96. Four subagents per ledger agent, capability ceiling 4.',
        values: {
          'ai.bullishness': 1,
          'ai.laborReplacement': 0.35,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 5,
          'ai.adoptionSteepness': 0.4,
          'ai.computeCostDeclineRate': 0.4,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 8,
          'ai.roboticsRampYears': 12,
          'agent.energyStepMonth': 96,
          'agent.energyStepSize': 0.5,
          'agent.costHalvingMonths': 24,
          'agent.capabilityCeiling': 4,
          'agent.subagentCeiling': 4,
        },
      },
      {
        id: 'high',
        name: 'High',
        detail:
          'Bullishness 1.5, labor replacement 0.7, fast adoption (midpoint year 3, steepness 1.2), automatable share ends at 95 percent, and reachable share 85 percent. Robotics start at year 2 and finish at year 8. Agent compute cost falls by three quarters from an energy breakthrough at month 48. Twenty subagents per ledger agent, capability ceiling 15.',
        values: {
          'ai.bullishness': 1.5,
          'ai.laborReplacement': 0.7,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.95,
          'ai.adoptionMidpointYear': 3,
          'ai.adoptionSteepness': 1.2,
          'ai.computeCostDeclineRate': 0.5,
          'ai.physicalTaskShare': 0.15,
          'ai.roboticsStartYear': 2,
          'ai.roboticsRampYears': 6,
          'agent.energyStepMonth': 48,
          'agent.energyStepSize': 0.75,
          'agent.costHalvingMonths': 18,
          'agent.capabilityCeiling': 15,
          'agent.subagentCeiling': 20,
        },
      },
      {
        id: 'extreme',
        name: 'Extreme',
        detail:
          'Bullishness 2, full labor replacement, adoption midpoint year 1, automatable share ends at 100 percent, and reachable share 100 percent from the start. Robotics finish by year 2. Agent compute cost falls by nine tenths from an energy breakthrough at month 24. One thousand subagents per ledger agent stand for a swarm, capability ceiling 50. The hiring target is near full unemployment by about year 4.',
        values: {
          'ai.bullishness': 2,
          'ai.laborReplacement': 1,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 1,
          'ai.adoptionMidpointYear': 1,
          'ai.adoptionSteepness': 1.5,
          'ai.computeCostDeclineRate': 0.6,
          'ai.physicalTaskShare': 0,
          'ai.roboticsStartYear': 0,
          'ai.roboticsRampYears': 2,
          'agent.energyStepMonth': 24,
          'agent.energyStepSize': 0.9,
          'agent.costHalvingMonths': 12,
          'agent.capabilityCeiling': 50,
          'agent.subagentCeiling': 1000,
        },
      },
    ],
  },
];
