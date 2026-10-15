import { getSlider } from '../../../core/src/config/registry.js';
import type { MetricId } from '../../../core/src/metrics/metrics.js';
import {
  applyCategoryOption,
  matchingCategoryOption,
  optionById,
  SCENARIO_WORLDS,
} from '../../../core/src/config/presets.js';
import {
  DEFICIT_LESSON_SEED,
  DEFICIT_LESSON_TICKS,
  deficitLessonSliders,
} from '../../../core/src/lesson/deficit.js';
import { defaultRegime } from './sliders.js';

/** Classroom runs match the opening page length. */
export const LESSON_TICKS = 120;

const DEFICIT_SPEND = 0.35;

/** Shared cannot-show lines for every lab. */
const SHARED_LIMITS = [
  'This lab is one closed economy. There is no trade with other countries.',
  'A category price that rises does not mean people switched stores; it is an accounting split of one basket.',
  'The result depends on the lever you change. A different assumption can reverse the picture.',
] as const;

export type LessonControlKind = 'none' | 'category' | 'regime' | 'patch';

export interface LessonControlOption {
  id: string;
  label: string;
  /** Plain sentence when this option comes from a scenario world. */
  plain?: string;
  /**
   * For patch controls: slider values applied on top of the lesson baseline.
   * Only these keys change; other baseline overrides stay.
   */
  patch?: Readonly<Record<string, number | string>>;
}

export interface LessonControl {
  kind: LessonControlKind;
  /** Preset category id when kind is category. */
  categoryId?: string;
  /** Option or regime id that matches the baseline. */
  baselineId: string;
  /** Label on the multi-option lever select; defaults to “Try a change”. */
  leverPrompt?: string;
  options: readonly LessonControlOption[];
}

export interface LessonChartSpec {
  key: string;
  title: string;
  description: string;
  /** When set, only these metric lines appear on the chart. */
  lineIds?: readonly MetricId[];
  /** Pad a flat comparison so a small CPI gap stays visible. */
  yMinFraction?: number;
}

export interface LessonSnapshotMetric {
  id: MetricId;
  label: string;
}

export interface LessonGuessChoice {
  id: string;
  label: string;
}

export interface Lesson {
  id: string;
  question: string;
  cannotShow: readonly string[];
  baseline: { regime: string; overrides: Record<string, number | string> };
  control: LessonControl;
  charts: readonly LessonChartSpec[];
  snapshotMetrics: readonly LessonSnapshotMetric[];
  prediction: {
    prompt: string;
    choices: readonly LessonGuessChoice[];
  };
  /** Prices lesson: fill a typical-household paragraph from aggregates. */
  typicalHousehold: boolean;
}

function emptyBaseline(): { regime: string; overrides: Record<string, number | string> } {
  return { regime: defaultRegime(), overrides: {} };
}

function worldPlain(id: string): string {
  const world = SCENARIO_WORLDS.find((item) => item.id === id);
  if (world === undefined) {
    throw new Error(`Unknown scenario world ${id}`);
  }
  return world.plain;
}

function optionLabel(categoryId: string, optionId: string): string {
  return optionById(categoryId, optionId).name;
}

function categoryBaseline(
  categoryId: string,
  optionId: string,
): { regime: string; overrides: Record<string, number | string> } {
  return {
    regime: defaultRegime(),
    overrides: applyCategoryOption(categoryId, optionId, {}),
  };
}

const GAINS_AI_OPTIONS = ['modest', 'substantial', 'high', 'extreme'] as const;

function gainsBaseline(): { regime: string; overrides: Record<string, number | string> } {
  let overrides = applyCategoryOption('aiBullishness', 'none', {});
  overrides = applyCategoryOption('publicFinance', 'ai-dividend', overrides);
  overrides = applyCategoryOption('centralBank', 'hawkish', overrides);
  overrides = applyCategoryOption('credit', 'moderate', overrides);
  return { regime: 'fiat', overrides };
}

function gainsAiPlain(optionId: string): string {
  if (optionId === 'modest') {
    return 'Machines spread slowly; the household grant stays near zero at first.';
  }
  if (optionId === 'substantial') {
    return 'Machines take a large share of tasks; the grant grows as adoption rises.';
  }
  if (optionId === 'high') {
    return 'Machines arrive quickly; unemployment and the grant both move up.';
  }
  if (optionId === 'extreme') {
    return 'Machines arrive fast; the grant rises sharply and jobs fall toward full measured unemployment.';
  }
  return optionLabel('aiBullishness', optionId);
}

export const LESSONS: readonly Lesson[] = [
  {
    id: 'prices',
    question: 'Which prices rise while others fall?',
    cannotShow: [...SHARED_LIMITS],
    baseline: emptyBaseline(),
    control: {
      kind: 'none',
      baselineId: 'baseline',
      options: [],
    },
    charts: [
      {
        key: 'prices',
        title: 'Prices',
        description:
          'The CPI is the average of the basket. Category prices can move apart: some rise while others fall.',
        lineIds: [
          'priceLevel',
          'priceHousing',
          'priceMedical',
          'priceApparel',
          'priceElectronics',
        ],
      },
    ],
    snapshotMetrics: [
      { id: 'priceLevel', label: 'CPI' },
      { id: 'priceHousing', label: 'Housing' },
      { id: 'priceMedical', label: 'Medical' },
      { id: 'priceApparel', label: 'Apparel' },
      { id: 'priceElectronics', label: 'Electronics' },
      { id: 'medianRealIncome', label: 'Median real income' },
    ],
    prediction: {
      prompt: 'Before you look: which categories get cheaper over ten years?',
      choices: [
        { id: 'housing-medical', label: 'Housing and medical care get cheaper' },
        { id: 'apparel-electronics', label: 'Apparel and electronics get cheaper' },
        { id: 'all-rise', label: 'Every category rises together' },
      ],
    },
    typicalHousehold: true,
  },
  {
    id: 'interest',
    question: 'What does a stronger inflation response do when inflation is already low?',
    cannotShow: [
      ...SHARED_LIMITS,
      'Each month the bank sets the policy interest rate with a formula that adds a few pieces. One piece is: multiplier × (inflation − 2%). Add that number (positive or negative) into the rate. Under 2% → negative piece → lower rate. Over 2% → positive piece → higher rate. A larger multiplier makes that push bigger.',
      'Jobs barely move in this lab, so this lesson is only about the interest rate.',
    ],
    baseline: categoryBaseline('centralBank', 'balanced'),
    control: {
      kind: 'patch',
      baselineId: 'balanced',
      options: [
        {
          id: 'balanced',
          label: 'Baseline',
          plain:
            'Baseline multiplier is 1.5. Example: inflation 0%, goal 2% → add 1.5 × (−2%) = −3 percentage points into the policy rate.',
          patch: {},
        },
        {
          id: 'hawkish',
          label: 'Use a larger inflation multiplier (1.5 → 2.5)',
          plain:
            'Only the multiplier changes, 1.5 → 2.5. Same example: add 2.5 × (−2%) = −5 percentage points — a bigger cut than baseline. Not “always raise rates.”',
          patch: { 'centralBank.inflationWeight': 2.5 },
        },
      ],
    },
    charts: [
      {
        key: 'turnover',
        title: 'Inflation',
        description:
          'Solid line is the baseline. The bank’s goal is 2% (0.02 on the axis). Here inflation stays under that goal, so (inflation − 2%) is negative.',
        lineIds: ['inflation'],
      },
      {
        key: 'labor',
        title: 'Policy rate',
        description:
          'Solid line is the baseline. Dashed line is the larger-multiplier run. This chart is the annual policy interest rate the formula sets.',
        lineIds: ['interestRate'],
      },
    ],
    snapshotMetrics: [
      { id: 'inflation', label: 'Inflation' },
      { id: 'interestRate', label: 'Policy rate' },
    ],
    prediction: {
      prompt:
        'Each month the bank sets the policy interest rate with a formula. One add-in is: multiplier × (inflation − 2%). Inflation stays under 2%, so that add-in is negative (it lowers the rate). If we raise the multiplier from 1.5 to 2.5, does the policy rate end higher or lower than the baseline?',
      choices: [
        { id: 'rate-up', label: 'Higher than the baseline' },
        { id: 'rate-down', label: 'Lower than the baseline' },
        { id: 'rate-same', label: 'About the same as the baseline' },
      ],
    },
    typicalHousehold: false,
  },
  {
    id: 'deficit',
    question: 'What if the government spends more than it taxes?',
    cannotShow: [
      ...SHARED_LIMITS,
      'Grant, stabilizer, and shocks are off so fiscal levers stay visible. The run is 48 months on a smaller economy.',
    ],
    baseline: deficitLessonSide('balanced', false, false),
    control: {
      kind: 'patch',
      baselineId: 'balanced',
      options: [
        {
          id: 'balanced',
          label: 'Balanced budget',
          plain: 'Tax and spending at 20 percent of income.',
        },
        {
          id: 'deficit-spending',
          label: 'Deficit spending',
          plain: 'Tax at 20 percent, purchases at 35 percent, so the treasury borrows for the gap.',
          patch: { 'government.spendingShareOfGDP': DEFICIT_SPEND },
        },
      ],
    },
    charts: [
      {
        key: 'prices',
        title: 'Prices',
        description:
          'CPI, the basket of posted firm prices. Solid is the balanced budget. Dashed is the deficit.',
        lineIds: ['priceLevel'],
        yMinFraction: 0.08,
      },
      {
        key: 'labor',
        title: 'Jobs',
        description: 'Unemployment is the share of people without a job.',
        lineIds: ['unemployment'],
      },
      {
        key: 'flows',
        title: 'Household goods',
        description:
          'What households spend on goods each month. The treasury still buys only leftover inventory.',
        lineIds: ['householdGoodsSpend'],
      },
      {
        key: 'money',
        title: 'Money stock',
        description:
          'Broad money. Bonds issued when taxes do not cover purchases create deposits, including cash the treasury later rebates.',
        lineIds: ['moneySupply'],
      },
    ],
    snapshotMetrics: [
      { id: 'priceLevel', label: 'CPI' },
      { id: 'unemployment', label: 'Unemployment' },
    ],
    prediction: {
      prompt: 'If the government spends more than it taxes, what happens to prices?',
      choices: [
        { id: 'prices-up', label: 'Prices end higher' },
        { id: 'prices-down', label: 'Prices end lower' },
        { id: 'prices-same', label: 'Prices stay about the same' },
      ],
    },
    typicalHousehold: false,
  },
  {
    id: 'bitcoin',
    question: 'What if nobody can print money?',
    cannotShow: [
      ...SHARED_LIMITS,
      'This is one closed economy switching units, not two countries trading, and not the United States converting.',
    ],
    baseline: emptyBaseline(),
    control: {
      kind: 'regime',
      baselineId: 'fiat',
      options: [
        {
          id: 'fiat',
          label: 'Fiat',
          plain: 'A central bank can create new money.',
        },
        {
          id: 'bitcoin',
          label: 'Bitcoin',
          plain: 'New money follows a fixed schedule. Nobody prints extra.',
        },
      ],
    },
    charts: [
      {
        key: 'prices',
        title: 'Prices',
        description: 'The CPI is the average price of the basket.',
        lineIds: ['priceLevel'],
      },
      {
        key: 'labor',
        title: 'Jobs',
        description: 'Unemployment is the share of people without a job.',
        lineIds: ['unemployment'],
      },
    ],
    snapshotMetrics: [
      { id: 'priceLevel', label: 'CPI' },
      { id: 'unemployment', label: 'Unemployment' },
    ],
    prediction: {
      prompt: 'If nobody can print money, what happens to prices versus fiat?',
      choices: [
        { id: 'prices-up', label: 'Prices end higher than under fiat' },
        { id: 'prices-down', label: 'Prices end lower than under fiat' },
        { id: 'prices-same', label: 'Prices end about the same' },
      ],
    },
    typicalHousehold: false,
  },
  {
    id: 'gains',
    question: 'Who gets the gains when machines do the work?',
    cannotShow: [
      ...SHARED_LIMITS,
      'Extreme AI is a scenario assumption, not a forecast.',
      'Unemployment is pulled toward a natural rate that rises as machines take tasks, so a shock can move jobs less than a textbook story.',
    ],
    baseline: gainsBaseline(),
    control: {
      kind: 'category',
      categoryId: 'aiBullishness',
      baselineId: 'none',
      leverPrompt: 'Select how much impact there will be from AI',
      options: GAINS_AI_OPTIONS.map((id) => ({
        id,
        label: optionLabel('aiBullishness', id),
        plain: gainsAiPlain(id),
      })),
    },
    charts: [
      {
        key: 'labor',
        title: 'Jobs',
        description: 'Unemployment is the share of people without a job.',
        lineIds: ['unemployment'],
      },
      {
        key: 'earnings',
        title: 'Who earns the output',
        description: 'Labor share is wages over output. Capital share is profits over wages plus profits.',
        lineIds: ['laborShare', 'capitalShare'],
      },
      {
        key: 'ubi',
        title: 'Household grant',
        description: 'Monthly grant paid equally across households from the AI share of output.',
      },
    ],
    snapshotMetrics: [
      { id: 'unemployment', label: 'Unemployment' },
      { id: 'laborShare', label: 'Labor share' },
      { id: 'ubiOutlay', label: 'Household grant' },
    ],
    prediction: {
      prompt: 'If households get a grant from the AI share of output, what happens to the grant line?',
      choices: [
        { id: 'grant-rises', label: 'The grant rises as machines arrive' },
        { id: 'grant-zero', label: 'The grant stays at zero' },
        { id: 'grant-falls', label: 'The grant falls' },
      ],
    },
    typicalHousehold: false,
  },
] as const;

const LESSON_BY_ID = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));

export function lessonById(id: string): Lesson | null {
  return LESSON_BY_ID.get(id) ?? null;
}

export function requireLesson(id: string): Lesson {
  const lesson = lessonById(id);
  if (lesson === null) {
    throw new Error(`Unknown lesson ${id}`);
  }
  return lesson;
}

export interface LessonLeverContext {
  addsDemand: boolean;
  pricesFollowDemand: boolean;
}

/** Resolved sliders for one deficit lesson side (balanced or deficit purchases). */
export function deficitLessonSide(
  choiceId: string,
  addsDemand: boolean,
  pricesFollowDemand: boolean,
): { regime: string; overrides: Record<string, number | string> } {
  const deficit = choiceId !== 'balanced';
  return {
    regime: 'fiat',
    overrides: deficitLessonSliders({ addsDemand, pricesFollowDemand, deficit }),
  };
}

export function readDeficitAssumptions(
  overrides: Readonly<Record<string, number | string>>,
): LessonLeverContext {
  return {
    addsDemand: overrides['government.spendingAddsDemand'] === 'on',
    pricesFollowDemand: Number(overrides['prices.trendWeight'] ?? 1) === 0,
  };
}

export function lessonRunTicks(lesson: Lesson): number {
  return lesson.id === 'deficit' ? DEFICIT_LESSON_TICKS : LESSON_TICKS;
}

export function lessonRunSeed(lesson: Lesson): number {
  return lesson.id === 'deficit' ? DEFICIT_LESSON_SEED : 1;
}

/** Apply a lever choice on top of the lesson baseline. */
export function applyLessonLever(
  lesson: Lesson,
  choiceId: string,
  context?: LessonLeverContext,
): { regime: string; overrides: Record<string, number | string> } {
  if (lesson.id === 'deficit') {
    if (!lesson.control.options.some((option) => option.id === choiceId)) {
      throw new Error(`Unknown option ${choiceId} for lesson ${lesson.id}`);
    }
    const assumptions = context ?? readDeficitAssumptions(lesson.baseline.overrides);
    return deficitLessonSide(choiceId, assumptions.addsDemand, assumptions.pricesFollowDemand);
  }
  if (lesson.control.kind === 'none') {
    return {
      regime: lesson.baseline.regime,
      overrides: { ...lesson.baseline.overrides },
    };
  }
  if (lesson.control.kind === 'regime') {
    if (!lesson.control.options.some((option) => option.id === choiceId)) {
      throw new Error(`Unknown regime choice ${choiceId} for lesson ${lesson.id}`);
    }
    return {
      regime: choiceId,
      overrides: { ...lesson.baseline.overrides },
    };
  }
  if (lesson.control.kind === 'patch') {
    const option = lesson.control.options.find((item) => item.id === choiceId);
    if (option === undefined) {
      throw new Error(`Unknown option ${choiceId} for lesson ${lesson.id}`);
    }
    return {
      regime: lesson.baseline.regime,
      overrides: applyPatch(lesson.baseline.overrides, option.patch ?? {}),
    };
  }
  const categoryId = lesson.control.categoryId;
  if (categoryId === undefined) {
    throw new Error(`Lesson ${lesson.id} is missing a category id`);
  }
  if (choiceId === lesson.control.baselineId) {
    return {
      regime: lesson.baseline.regime,
      overrides: { ...lesson.baseline.overrides },
    };
  }
  if (!lesson.control.options.some((option) => option.id === choiceId)) {
    throw new Error(`Unknown option ${choiceId} for lesson ${lesson.id}`);
  }
  return {
    regime: lesson.baseline.regime,
    overrides: applyCategoryOption(categoryId, choiceId, lesson.baseline.overrides),
  };
}

/** Merge a patch onto baseline overrides; values equal to the registry default are omitted. */
export function applyPatch(
  baseline: Readonly<Record<string, number | string>>,
  patch: Readonly<Record<string, number | string>>,
): Record<string, number | string> {
  const next: Record<string, number | string> = { ...baseline };
  for (const id of Object.keys(patch)) {
    const value = patch[id];
    if (value === undefined) {
      continue;
    }
    const slider = getSlider(id);
    if (String(value) === String(slider.default)) {
      delete next[id];
    } else {
      next[id] = value;
    }
  }
  return next;
}

/** True when the run settings match the lesson's pinned baseline lever. */
export function lessonRunMatchesBaseline(
  lesson: Lesson,
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): boolean {
  return regime === lesson.baseline.regime && sameOverrides(overrides, lesson.baseline.overrides);
}

/** Opening page state for a lesson link (baseline lever, one seed, classroom length). */
export function lessonPageState(lesson: Lesson): {
  seed: number;
  ticks: number;
  seeds: number;
  regime: string;
  overrides: Record<string, number | string>;
  lesson: string;
} {
  return {
    seed: lessonRunSeed(lesson),
    ticks: lessonRunTicks(lesson),
    seeds: 1,
    regime: lesson.baseline.regime,
    overrides: { ...lesson.baseline.overrides },
    lesson: lesson.id,
  };
}

/** Current control choice implied by the live session. */
export function matchingLessonChoice(
  lesson: Lesson,
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): string | null {
  if (lesson.control.kind === 'none') {
    return lesson.control.baselineId;
  }
  if (lesson.control.kind === 'regime') {
    return lesson.control.options.some((option) => option.id === regime) ? regime : null;
  }
  if (lesson.control.kind === 'patch') {
    if (lesson.id === 'deficit') {
      const assumptions = readDeficitAssumptions(overrides);
      for (const option of lesson.control.options) {
        const side = deficitLessonSide(option.id, assumptions.addsDemand, assumptions.pricesFollowDemand);
        if (sameOverrides(side.overrides, overrides) && regime === side.regime) {
          return option.id;
        }
      }
      return null;
    }
    for (const option of lesson.control.options) {
      const applied = applyPatch(lesson.baseline.overrides, option.patch ?? {});
      if (sameOverrides(applied, overrides) && regime === lesson.baseline.regime) {
        return option.id;
      }
    }
    return null;
  }
  const categoryId = lesson.control.categoryId;
  if (categoryId === undefined) {
    return null;
  }
  if (
    sameOverrides(lesson.baseline.overrides, overrides) &&
    regime === lesson.baseline.regime
  ) {
    return lesson.control.baselineId;
  }
  for (const option of lesson.control.options) {
    const applied = applyCategoryOption(categoryId, option.id, lesson.baseline.overrides);
    if (sameOverrides(applied, overrides) && regime === lesson.baseline.regime) {
      return option.id;
    }
  }
  return null;
}

function sameOverrides(
  left: Readonly<Record<string, number | string>>,
  right: Readonly<Record<string, number | string>>,
): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (let i = 0; i < leftKeys.length; i += 1) {
    const key = leftKeys[i];
    if (key === undefined || key !== rightKeys[i]) {
      return false;
    }
    if (String(left[key]) !== String(right[key])) {
      return false;
    }
  }
  return true;
}

/** Worlds keep a plain sentence for lesson copy. */
export function worldPlainSentences(): readonly { id: string; plain: string }[] {
  return SCENARIO_WORLDS.map((world) => ({ id: world.id, plain: world.plain }));
}

/** Smoke-check that the gains lab opens with no AI and the AI dividend fiscal stance. */
export function gainsBaselineMatchesWorld(): boolean {
  const lesson = requireLesson('gains');
  return (
    matchingCategoryOption('aiBullishness', lesson.baseline.overrides) === 'none' &&
    matchingCategoryOption('publicFinance', lesson.baseline.overrides) === 'ai-dividend'
  );
}
