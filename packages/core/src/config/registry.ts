import { PLACEHOLDER_SOURCE } from './limits.js';

export type SliderGroup =
  'behavior' | 'environment' | 'policy' | 'regime' | 'goods' | 'contracts' | 'welfare' | 'ai';

export type SliderStatus = 'sourced' | 'calibrated' | 'guess';

interface SliderBase {
  id: string;
  label: string;
  group: SliderGroup;
  unit: string;
  description: string;
  source: string;
  status: SliderStatus;
}

export interface NumberSlider extends SliderBase {
  kind: 'number';
  default: number;
  min: number;
  max: number;
}

export interface EnumSlider extends SliderBase {
  kind: 'enum';
  default: string;
  options: readonly string[];
}

export type Slider = NumberSlider | EnumSlider;

function numberSlider(
  id: string,
  label: string,
  group: SliderGroup,
  unit: string,
  defaultValue: number,
  min: number,
  max: number,
  description: string,
): NumberSlider {
  return {
    id,
    label,
    group,
    unit,
    kind: 'number',
    default: defaultValue,
    min,
    max,
    description,
    source: PLACEHOLDER_SOURCE,
    status: 'guess',
  };
}

function enumSlider(
  id: string,
  label: string,
  group: SliderGroup,
  unit: string,
  defaultValue: string,
  options: readonly string[],
  description: string,
): EnumSlider {
  return {
    id,
    label,
    group,
    unit,
    kind: 'enum',
    default: defaultValue,
    options,
    description,
    source: PLACEHOLDER_SOURCE,
    status: 'guess',
  };
}

export const SLIDERS: readonly Slider[] = [
  numberSlider(
    'household.timePreferenceMean',
    'Mean time preference',
    'behavior',
    '1/year',
    0.04,
    0.01,
    0.15,
    'Average annual rate at which households discount future consumption.',
  ),
  numberSlider(
    'household.timePreferenceStd',
    'Time preference spread',
    'behavior',
    '1/year',
    0.02,
    0,
    0.08,
    'Standard deviation of household time preference.',
  ),
  numberSlider(
    'household.skillSigma',
    'Skill dispersion',
    'behavior',
    'log points',
    0.5,
    0.1,
    1.2,
    'Spread of the lognormal distribution of household skill.',
  ),
  numberSlider(
    'household.trustInBanks',
    'Trust in banks',
    'behavior',
    'share',
    0.9,
    0,
    1,
    'Share of households willing to hold bank deposits.',
  ),
  numberSlider(
    'firm.markup',
    'Firm markup',
    'behavior',
    'share of cost',
    0.2,
    0.05,
    0.6,
    'Price markup over unit cost before inventory adjustment.',
  ),
  numberSlider(
    'firm.priceAdjustSpeed',
    'Price adjustment speed',
    'behavior',
    'share per tick',
    0.3,
    0.05,
    1,
    'How fast a firm moves its price when inventories are high or low.',
  ),
  numberSlider(
    'wage.nominalRigidity',
    'Nominal wage rigidity',
    'behavior',
    'share',
    0.7,
    0,
    0.95,
    'How slowly wages move toward the target, especially downward.',
  ),
  numberSlider(
    'productivity.baseGrowth',
    'Baseline productivity growth',
    'environment',
    '1/year',
    0.01,
    0,
    0.04,
    'Annual productivity growth before the AI channels.',
  ),
  numberSlider(
    'population.growth',
    'Population growth',
    'environment',
    '1/year',
    0.005,
    -0.01,
    0.02,
    'Annual change in the human population.',
  ),
  numberSlider(
    'shock.frequency',
    'Shock frequency',
    'environment',
    '1/year',
    0.1,
    0,
    1,
    'Expected number of macroeconomic shocks per year.',
  ),
  numberSlider(
    'shock.size',
    'Shock size',
    'environment',
    'share',
    0.05,
    0,
    0.3,
    'Typical size of a productivity, demand, or credit shock.',
  ),
  numberSlider(
    'tax.incomeRate',
    'Income tax rate',
    'policy',
    'share',
    0.2,
    0,
    0.5,
    'Share of income collected as tax.',
  ),
  numberSlider(
    'government.spendingShareOfGDP',
    'Government spending share',
    'policy',
    'share of GDP',
    0.2,
    0,
    0.5,
    'Government spending as a share of GDP.',
  ),
  numberSlider(
    'centralBank.inflationTarget',
    'Inflation target',
    'policy',
    '1/year',
    0.02,
    0,
    0.06,
    'Annual inflation rate the fiat central bank aims for.',
  ),
  numberSlider(
    'centralBank.inflationWeight',
    'Inflation weight',
    'policy',
    'coefficient',
    1.5,
    1,
    3,
    'Weight on the inflation gap in the fiat policy-rate rule.',
  ),
  numberSlider(
    'centralBank.outputWeight',
    'Output weight',
    'policy',
    'coefficient',
    0.5,
    0,
    1.5,
    'Weight on the output gap in the fiat policy-rate rule.',
  ),
  numberSlider(
    'bank.reserveRequirement',
    'Reserve requirement',
    'policy',
    'share',
    0.1,
    0,
    0.3,
    'Share of deposits a bank must hold as reserves.',
  ),
  numberSlider(
    'bank.capitalRatio',
    'Bank capital ratio',
    'policy',
    'share',
    0.08,
    0.04,
    0.2,
    'Minimum capital relative to assets.',
  ),
  enumSlider(
    'regime.type',
    'Monetary regime',
    'regime',
    'regime',
    'fiat',
    ['fiat', 'bitcoin', 'hybrid'],
    'Rule set for base money, lending, and government finance.',
  ),
  enumSlider(
    'bitcoin.lendingModel',
    'Bitcoin lending model',
    'regime',
    'model',
    'maturityMatched',
    ['maturityMatched', 'fullReserve'],
    'Whether bitcoin-regime loans are maturity-matched or full reserve.',
  ),
  numberSlider(
    'goods.electronicsProductivity',
    'Electronics productivity growth',
    'goods',
    '1/year',
    0.08,
    0,
    0.3,
    'Annual productivity growth of electronics-like goods.',
  ),
  numberSlider(
    'goods.beachfrontSupplyGrowth',
    'Beachfront supply growth',
    'goods',
    '1/year',
    0,
    -0.01,
    0.02,
    'Annual change in the supply of scarce property.',
  ),
  numberSlider(
    'deflation.sensitivity',
    'Deflation sensitivity',
    'contracts',
    'coefficient',
    1,
    0,
    5,
    'How strongly expected deflation reduces lending, borrowing, and speculation.',
  ),
  numberSlider(
    'welfare.housingSecurityWeight',
    'Housing security weight',
    'welfare',
    'coefficient',
    0.5,
    0,
    2,
    'Weight of housing security in human well-being.',
  ),
  numberSlider(
    'welfare.weightInequality',
    'Inequality weight',
    'welfare',
    'weight',
    0,
    0,
    1,
    'Optional composite weight on equality. Zero leaves the composite off.',
  ),
  numberSlider(
    'welfare.weightMedianWealth',
    'Median wealth weight',
    'welfare',
    'weight',
    0,
    0,
    1,
    'Optional composite weight on median wealth.',
  ),
  numberSlider(
    'welfare.weightWellbeing',
    'Well-being weight',
    'welfare',
    'weight',
    0,
    0,
    1,
    'Optional composite weight on median well-being.',
  ),
  numberSlider(
    'welfare.weightStability',
    'Stability weight',
    'welfare',
    'weight',
    0,
    0,
    1,
    'Optional composite weight on macroeconomic stability.',
  ),
  numberSlider(
    'ai.automatableShareStart',
    'Initial automatable share',
    'ai',
    'share',
    0.1,
    0,
    0.5,
    'Share of tasks software can do at the start of a run.',
  ),
  numberSlider(
    'ai.automatableShareEnd',
    'Final automatable share',
    'ai',
    'share',
    0.9,
    0.3,
    1,
    'Share of tasks software can do after the adoption curve finishes.',
  ),
  numberSlider(
    'ai.adoptionMidpointYear',
    'AI adoption midpoint',
    'ai',
    'years',
    15,
    3,
    40,
    'Year at which AI adoption is halfway from the start share to the end share.',
  ),
  numberSlider(
    'ai.adoptionSteepness',
    'AI adoption steepness',
    'ai',
    '1/year',
    0.4,
    0.1,
    1.5,
    'How quickly the automatable share moves through its S-curve.',
  ),
  numberSlider(
    'ai.computeCostDeclineRate',
    'Compute cost decline',
    'ai',
    '1/year',
    0.3,
    0,
    0.6,
    'Annual rate at which the cost of AI compute falls.',
  ),
  numberSlider(
    'ai.physicalTaskShare',
    'Physical task share',
    'ai',
    'share',
    0.3,
    0,
    0.7,
    'Share of tasks that software cannot automate.',
  ),
  numberSlider(
    'ai.ownershipConcentration',
    'AI ownership concentration',
    'ai',
    'share',
    0.8,
    0.1,
    0.99,
    'How concentrated ownership of AI capital is across humans.',
  ),
  numberSlider(
    'ai.agentAutonomyShareEnd',
    'AI agent autonomy share',
    'ai',
    'share',
    0.5,
    0,
    1,
    'Share of agents that eventually transact on their own account.',
  ),
  numberSlider(
    'ai.paymentFrictionFiat',
    'Fiat payment friction',
    'ai',
    'share per transaction',
    0.02,
    0,
    0.1,
    'Fee on an AI-agent payment in the fiat regime.',
  ),
  numberSlider(
    'ai.paymentFrictionBitcoin',
    'Bitcoin payment friction',
    'ai',
    'share per transaction',
    0.005,
    0,
    0.1,
    'Fee on an AI-agent payment in the bitcoin regime.',
  ),
];

const SLIDER_BY_ID = new Map<string, Slider>(SLIDERS.map((slider) => [slider.id, slider]));

assertRegistry(SLIDERS);

export function listSliders(): readonly Slider[] {
  return SLIDERS;
}

export function getSlider(id: string): Slider {
  const slider = SLIDER_BY_ID.get(id);
  if (!slider) {
    throw new Error(`Unknown slider ${id}`);
  }
  return slider;
}

export function assertSliderValue(id: string, value: number | string): void {
  const slider = getSlider(id);
  if (slider.kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${id} must be a finite number`);
    }
    if (value < slider.min || value > slider.max) {
      throw new Error(`${id} must be between ${slider.min} and ${slider.max}`);
    }
    return;
  }
  if (typeof value !== 'string' || !slider.options.includes(value)) {
    throw new Error(`${id} must be one of ${slider.options.join(', ')}`);
  }
}

function assertRegistry(sliders: readonly Slider[]): void {
  const seen = new Set<string>();
  for (const slider of sliders) {
    if (seen.has(slider.id)) {
      throw new Error(`Duplicate slider ${slider.id}`);
    }
    seen.add(slider.id);
    if (slider.kind === 'number') {
      if (slider.min > slider.max || slider.default < slider.min || slider.default > slider.max) {
        throw new Error(`Slider ${slider.id} has a default outside its range`);
      }
    } else if (!slider.options.includes(slider.default)) {
      throw new Error(`Slider ${slider.id} default is not an allowed option`);
    }
  }
}
