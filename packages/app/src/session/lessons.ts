import type { MetricId } from '../../../core/src/metrics/metrics.js';
import {
  applyCategoryOption,
  applyScenarioWorld,
  optionById,
  SCENARIO_WORLDS,
} from '../../../core/src/config/presets.js';
import { defaultRegime } from './sliders.js';

/** Classroom runs match the opening page length. */
export const LESSON_TICKS = 120;

/** Shared cannot-show lines for every lab. */
const SHARED_LIMITS = [
  'This lab is one closed economy. There is no trade with other countries.',
  'A category price that rises does not mean people switched stores; it is an accounting split of one basket.',
  'The result depends on the lever you change. A different assumption can reverse the picture.',
] as const;

export type LessonControlKind = 'none' | 'category' | 'regime';

export interface LessonControlOption {
  id: string;
  label: string;
  /** Plain sentence when this option comes from a scenario world. */
  plain?: string;
}

export interface LessonControl {
  kind: LessonControlKind;
  /** Preset category id when kind is category. */
  categoryId?: string;
  /** Option or regime id that matches the baseline. */
  baselineId: string;
  options: readonly LessonControlOption[];
}

export interface LessonChartSpec {
  key: string;
  title: string;
  description: string;
  /** When set, only these metric lines appear on the chart. */
  lineIds?: readonly MetricId[];
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

function lockedGainsBaseline(
  publicFinanceId: string,
): { regime: string; overrides: Record<string, number | string> } {
  let overrides = applyCategoryOption('aiBullishness', 'extreme', {});
  overrides = applyCategoryOption('publicFinance', publicFinanceId, overrides);
  overrides = applyCategoryOption('centralBank', 'hawkish', overrides);
  overrides = applyCategoryOption('credit', 'moderate', overrides);
  return { regime: 'fiat', overrides };
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
    question: 'Who sets the interest rate, and what happens to jobs?',
    cannotShow: [...SHARED_LIMITS],
    baseline: categoryBaseline('centralBank', 'balanced'),
    control: {
      kind: 'category',
      categoryId: 'centralBank',
      baselineId: 'balanced',
      options: [
        {
          id: 'balanced',
          label: optionLabel('centralBank', 'balanced'),
          plain: 'The central bank weighs inflation and jobs about evenly.',
        },
        {
          id: 'hawkish',
          label: optionLabel('centralBank', 'hawkish'),
          plain: 'The central bank fights inflation harder and leaves jobs second.',
        },
        {
          id: 'employment-leaning',
          label: optionLabel('centralBank', 'employment-leaning'),
          plain: 'The central bank puts more weight on jobs.',
        },
      ],
    },
    charts: [
      {
        key: 'labor',
        title: 'Jobs and the policy rate',
        description: 'Unemployment is the share of people without a job. The policy rate is the annual interest rate.',
        lineIds: ['unemployment', 'interestRate'],
      },
    ],
    snapshotMetrics: [
      { id: 'unemployment', label: 'Unemployment' },
      { id: 'interestRate', label: 'Policy rate' },
    ],
    prediction: {
      prompt: 'If the central bank fights inflation harder, what happens to jobs at the end?',
      choices: [
        { id: 'jobs-better', label: 'Unemployment ends lower' },
        { id: 'jobs-worse', label: 'Unemployment ends higher' },
        { id: 'jobs-same', label: 'Unemployment stays about the same' },
      ],
    },
    typicalHousehold: false,
  },
  {
    id: 'deficit',
    question: 'What if the government spends more than it taxes?',
    cannotShow: [...SHARED_LIMITS],
    baseline: categoryBaseline('publicFinance', 'moderate'),
    control: {
      kind: 'category',
      categoryId: 'publicFinance',
      baselineId: 'moderate',
      options: [
        {
          id: 'moderate',
          label: optionLabel('publicFinance', 'moderate'),
          plain: 'Tax and spending at 20 percent of GDP.',
        },
        {
          id: 'small',
          label: optionLabel('publicFinance', 'small'),
          plain: 'Tax and spending at 10 percent of GDP.',
        },
        {
          id: 'deficit-spending',
          label: optionLabel('publicFinance', 'deficit-spending'),
          plain: 'Spending sits above taxes, so the government borrows more.',
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
    baseline: lockedGainsBaseline('private-surplus'),
    control: {
      kind: 'category',
      categoryId: 'publicFinance',
      baselineId: 'private-surplus',
      options: [
        {
          id: 'private-surplus',
          label: optionLabel('publicFinance', 'private-surplus'),
          plain: worldPlain('private-surplus'),
        },
        {
          id: 'ai-dividend',
          label: optionLabel('publicFinance', 'ai-dividend'),
          plain: 'Machines arrive fast, and households get a grant from the AI share of output.',
        },
      ],
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

/** Apply a lever choice on top of the lesson baseline. */
export function applyLessonLever(
  lesson: Lesson,
  choiceId: string,
): { regime: string; overrides: Record<string, number | string> } {
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
  const categoryId = lesson.control.categoryId;
  if (categoryId === undefined) {
    throw new Error(`Lesson ${lesson.id} is missing a category id`);
  }
  if (!lesson.control.options.some((option) => option.id === choiceId)) {
    throw new Error(`Unknown option ${choiceId} for lesson ${lesson.id}`);
  }
  return {
    regime: lesson.baseline.regime,
    overrides: applyCategoryOption(categoryId, choiceId, lesson.baseline.overrides),
  };
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
    seed: 1,
    ticks: LESSON_TICKS,
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
  const categoryId = lesson.control.categoryId;
  if (categoryId === undefined) {
    return null;
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

/** Smoke-check that gains baseline matches the private-surplus world composition for AI and fiscal. */
export function gainsBaselineMatchesWorld(): boolean {
  const world = applyScenarioWorld('private-surplus', {});
  const lesson = requireLesson('gains');
  return (
    world.regime === lesson.baseline.regime &&
    String(world.overrides['government.ubiShare'] ?? 0) ===
      String(lesson.baseline.overrides['government.ubiShare'] ?? 0) &&
    String(world.overrides['ai.laborReplacement'] ?? 0) ===
      String(lesson.baseline.overrides['ai.laborReplacement'] ?? 0)
  );
}
