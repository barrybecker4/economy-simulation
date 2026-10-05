import type { MetricId } from '../../../core/src/metrics/metrics.js';
import type { BandRunResult, RunSuccess } from '../worker/protocol.js';
import { assertSent, requireSeries } from '../worker/series.js';

export interface ChartLine {
  label: string;
  values: number[];
  color: string;
}

export interface ChartView {
  key: string;
  title: string;
  unit: string;
  description: string;
  lines: ChartLine[];
  group: string;
  note?: string;
}

interface LineSpec {
  id: MetricId;
  label: string;
  color: string;
}

interface ChartSpec {
  key: string;
  title: string;
  group: string;
  unit: 'money' | 'share' | 'log' | 'output';
  description: string;
  lines: readonly LineSpec[];
}

const SPECS: readonly ChartSpec[] = [
  {
    key: 'wellbeing',
    title: 'Well-being',
    group: 'Welfare',
    unit: 'log',
    description:
      'Mean and median human well-being. The level is the natural log of real consumption, floored at 0.01, plus a housing-security term. AI agents are not included. A five-seed band draws the median.',
    lines: [
      { id: 'meanWellbeing', label: 'Mean well-being', color: '#0b6' },
      { id: 'medianWellbeing', label: 'Median well-being', color: '#064' },
    ],
  },
  {
    key: 'prices',
    title: 'Prices',
    group: 'Prices',
    unit: 'money',
    description:
      'CPI is the expenditure-weighted basket. Food and beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics can move apart from it. A five-seed band draws each median.',
    lines: [
      { id: 'priceLevel', label: 'CPI', color: '#1e3a8a' },
      { id: 'priceFood', label: 'Food and bev', color: '#9a3412' },
      { id: 'priceHousing', label: 'Housing', color: '#a16207' },
      { id: 'priceEnergy', label: 'Energy', color: '#c2410c' },
      { id: 'priceApparel', label: 'Apparel', color: '#7e22ce' },
      { id: 'priceTransportation', label: 'Transportation', color: '#0f766e' },
      { id: 'priceMedical', label: 'Medical', color: '#be123c' },
      { id: 'priceEducation', label: 'Education', color: '#0369a1' },
      { id: 'priceRecreation', label: 'Recreation', color: '#4d7c0f' },
      { id: 'priceElectronics', label: 'Electronics', color: '#db2777' },
    ],
  },
  {
    key: 'labor',
    title: 'Labor and interest',
    group: 'Labor',
    unit: 'share',
    description:
      'Unemployment is the share of households without a job. Natural unemployment rises as AI shrinks the hiring target. The policy rate is the annual interest rate: under fiat it follows inflation and the gap from that natural rate, scaled by the human share of output, and under bitcoin or hybrid it moves with the gap between loans and savings. A five-seed band draws each median.',
    lines: [
      { id: 'unemployment', label: 'Unemployment', color: '#b45309' },
      { id: 'naturalUnemployment', label: 'Natural unemployment', color: '#92400e' },
      { id: 'interestRate', label: 'Policy rate', color: '#1d4ed8' },
    ],
  },
  {
    key: 'ubi',
    title: 'Household grant',
    group: 'Public accounts',
    unit: 'money',
    description:
      'Monthly UBI outlay. The pool is the UBI share slider times the AI share of output times nominal GDP, split equally across households. It starts at zero when AI capacity is not adopted.',
    lines: [{ id: 'ubiOutlay', label: 'UBI outlay', color: '#047857' }],
  },
  {
    key: 'tax',
    title: 'Tax revenue',
    group: 'Public accounts',
    unit: 'money',
    description:
      'Income tax collected from households and from AI agents. A five-seed band draws each median.',
    lines: [
      { id: 'taxRevenue', label: 'Total tax', color: '#0f766e' },
      { id: 'agentTaxRevenue', label: 'Agent tax', color: '#a21caf' },
    ],
  },
  {
    key: 'credit',
    title: 'Credit to GDP',
    group: 'Credit',
    unit: 'share',
    description:
      "Private credit relative to annualized nominal GDP: firm and household loans divided by twelve times this month's nominal output. Government bonds are not in this ratio. A five-seed band draws the median.",
    lines: [{ id: 'creditToGdp', label: 'Credit to GDP', color: '#7c3aed' }],
  },
  {
    key: 'ai',
    title: 'AI',
    group: 'AI',
    unit: 'share',
    description:
      'Tasks automated is the share of tasks software can do. AI agents is autonomous agents divided by households plus agents. AI share of output is the fraction of capacity from the AI multiplier. AI wealth is agent deposits over household plus agent deposits. AI transactions is agent compute sales plus agent goods over household goods plus compute sales. With equal start and end automatable shares that share stays at zero. A five-seed band draws each median.',
    lines: [
      { id: 'tasksAutomated', label: 'Tasks automated', color: '#0f766e' },
      { id: 'aiShareOfAgents', label: 'AI agents', color: '#a21caf' },
      { id: 'aiShareOfOutput', label: 'AI share of output', color: '#c2410c' },
      { id: 'aiShareOfWealth', label: 'AI wealth', color: '#1d4ed8' },
      { id: 'aiShareOfTransactions', label: 'AI transactions', color: '#a16207' },
    ],
  },
  {
    key: 'ai-spend',
    title: 'AI goods spend',
    group: 'AI',
    unit: 'money',
    description:
      'Goods bought by autonomous AI agents that month. A five-seed band draws the median.',
    lines: [{ id: 'agentGoodsSpend', label: 'Agent goods', color: '#be123c' }],
  },
  {
    key: 'output',
    title: 'Output',
    group: 'Output',
    unit: 'output',
    description:
      'Real GDP is the sum of firm capacities. Productivity per human is real GDP divided by employed households. Real investment is capital gaps installed that month. A five-seed band draws each median.',
    lines: [
      { id: 'realGdp', label: 'Real GDP', color: '#1e3a8a' },
      { id: 'productivityPerHuman', label: 'Productivity per human', color: '#0f766e' },
      { id: 'realInvestment', label: 'Real investment', color: '#a16207' },
    ],
  },
  {
    key: 'living',
    title: 'Living standards',
    group: 'Living standards',
    unit: 'money',
    description:
      'Real wage is the money wage divided by CPI. Mean and median real income and real consumption use households only. A five-seed band draws each median.',
    lines: [
      { id: 'realWage', label: 'Real wage', color: '#1d4ed8' },
      { id: 'meanRealIncome', label: 'Mean real income', color: '#0f766e' },
      { id: 'medianRealIncome', label: 'Median real income', color: '#065f46' },
      { id: 'meanRealConsumption', label: 'Mean real consumption', color: '#9a3412' },
      { id: 'medianRealConsumption', label: 'Median real consumption', color: '#7c2d12' },
    ],
  },
  {
    key: 'inequality',
    title: 'Inequality',
    group: 'Inequality',
    unit: 'share',
    description:
      'Gini of household wealth, income, and consumption. Top-decile and bottom-quintile wealth shares, and the share of households below one quarter of median real consumption. A five-seed band draws each median.',
    lines: [
      { id: 'giniWealth', label: 'Wealth Gini', color: '#7c3aed' },
      { id: 'giniIncome', label: 'Income Gini', color: '#1d4ed8' },
      { id: 'giniConsumption', label: 'Consumption Gini', color: '#0f766e' },
      { id: 'topDecileWealthShare', label: 'Top decile wealth', color: '#be123c' },
      { id: 'bottomQuintileWealthShare', label: 'Bottom quintile wealth', color: '#a16207' },
      { id: 'consumptionFloorShare', label: 'Consumption floor', color: '#57534e' },
    ],
  },
  {
    key: 'turnover',
    title: 'Inflation and turnover',
    group: 'Money',
    unit: 'share',
    description:
      'Twelve-month CPI inflation, velocity of deposits through consumption and investment, and loans relative to the savings stock. A five-seed band draws each median.',
    lines: [
      { id: 'inflation', label: 'Inflation', color: '#be123c' },
      { id: 'velocity', label: 'Velocity', color: '#1d4ed8' },
      { id: 'loanToSavings', label: 'Loans to savings', color: '#7c3aed' },
    ],
  },
  {
    key: 'money',
    title: 'Money stocks',
    group: 'Money',
    unit: 'money',
    description:
      'Money supply is household, firm, agent, and government deposits. Base money is bank reserves. A five-seed band draws each median.',
    lines: [
      { id: 'moneySupply', label: 'Money supply', color: '#1e3a8a' },
      { id: 'baseMoney', label: 'Base money', color: '#0f766e' },
    ],
  },
  {
    key: 'shocks',
    title: 'Shocks',
    group: 'Shocks',
    unit: 'share',
    description:
      'Demand, credit, and productivity impulses. A positive spell is the twelve-month expansion; a negative spell is the contraction. Zero when no shock is active. A five-seed band draws each median.',
    lines: [
      { id: 'demandImpulse', label: 'Demand', color: '#b45309' },
      { id: 'creditImpulse', label: 'Credit', color: '#7c3aed' },
      { id: 'productivityImpulse', label: 'Productivity', color: '#0f766e' },
    ],
  },
  {
    key: 'flows',
    title: 'Monthly payment flows',
    group: 'This month',
    unit: 'money',
    description:
      'Who paid whom that month: household and agent goods, government purchases, wages, profits, tax, the household grant, AI compute sales and fees, sweeps to owners, interest, new loans, and loan repayment. A five-seed band draws each median.',
    lines: [
      { id: 'householdGoodsSpend', label: 'Household goods', color: '#1e3a8a' },
      { id: 'agentGoodsSpend', label: 'Agent goods', color: '#be123c' },
      { id: 'govGoodsSpend', label: 'Government goods', color: '#0f766e' },
      { id: 'wageBill', label: 'Wages', color: '#a16207' },
      { id: 'profitPaid', label: 'Profits', color: '#7c3aed' },
      { id: 'taxRevenue', label: 'Tax', color: '#0369a1' },
      { id: 'ubiOutlay', label: 'Grant', color: '#047857' },
      { id: 'agentVolume', label: 'Compute sales', color: '#a21caf' },
      { id: 'agentFees', label: 'Agent fees', color: '#9a3412' },
      { id: 'agentSweep', label: 'Owner sweep', color: '#4d7c0f' },
      { id: 'interestPaid', label: 'Interest', color: '#1d4ed8' },
      { id: 'newBorrowing', label: 'New loans', color: '#c2410c' },
      { id: 'loanRepaid', label: 'Loan repayment', color: '#57534e' },
    ],
  },
];

for (const spec of SPECS) {
  for (const line of spec.lines) {
    assertSent(line.id);
  }
}

export function moneyUnit(regime: string): string {
  if (regime === 'fiat') {
    return 'cents';
  }
  if (regime === 'bitcoin' || regime === 'hybrid') {
    return 'satoshis';
  }
  throw new Error(`Unknown regime ${regime}`);
}

export function chartViews(result: RunSuccess, regime: string): ChartView[] {
  if (result.ticks.length === 0) {
    throw new Error('Run has no ticks');
  }
  const displayed = result.kind === 'compare' ? 'fiat' : regime;
  const views = SPECS.map((spec) => viewFromSpec(spec, result, displayed));
  if (result.kind === 'compare') {
    return [compareView(result), ...views];
  }
  if (result.kind === 'band') {
    const withBand = [...views];
    const pricesAt = withBand.findIndex((view) => view.key === 'prices');
    withBand.splice(pricesAt + 1, 0, cpiBandView(result, displayed));
    return withBand;
  }
  return views;
}

/** Cents in one dollar. Display only; ledger amounts stay in cents. */
const CENTS_PER_DOLLAR = 100;
/** Fiat money charts stay in cents at this level and switch to dollars above it. */
const CENT_DISPLAY_MAX = 1_000;

function viewFromSpec(spec: ChartSpec, result: RunSuccess, regime: string): ChartView {
  const scaled = scaleCents(
    unitText(spec.unit, regime),
    spec.lines.map((line) => lineOf(result, line)),
  );
  return {
    key: spec.key,
    title: spec.title,
    group: spec.group,
    unit: scaled.unit,
    description: spec.description,
    lines: scaled.lines,
  };
}

function scaleCents(unit: string, lines: ChartLine[]): { unit: string; lines: ChartLine[] } {
  if (unit !== 'cents' || peakAbs(lines) <= CENT_DISPLAY_MAX) {
    return { unit, lines };
  }
  return { unit: 'dollars', lines: lines.map(asDollars) };
}

function peakAbs(lines: readonly ChartLine[]): number {
  let peak = 0;
  for (const line of lines) {
    for (const value of line.values) {
      if (Number.isFinite(value)) {
        peak = Math.max(peak, Math.abs(value));
      }
    }
  }
  return peak;
}

function asDollars(line: ChartLine): ChartLine {
  return { ...line, values: line.values.map((value) => value / CENTS_PER_DOLLAR) };
}

function unitText(unit: ChartSpec['unit'], regime: string): string {
  if (unit === 'money') {
    return moneyUnit(regime);
  }
  if (unit === 'share') {
    return 'share';
  }
  if (unit === 'output') {
    return 'real units';
  }
  return 'log points';
}

function lineOf(result: RunSuccess, spec: LineSpec): ChartLine {
  return checkedLine(result.ticks, spec.label, valuesFor(result, spec.id), spec.color);
}

function valuesFor(result: RunSuccess, id: string): number[] {
  if (result.kind === 'band') {
    return bandMid(result, id);
  }
  return requireSeries(result.series, id);
}

function bandMid(result: BandRunResult, id: string): number[] {
  const band = result.bands[id];
  if (band === undefined) {
    throw new Error(`Missing band ${id}`);
  }
  return band.mid;
}

function compareView(result: RunSuccess): ChartView {
  return {
    key: 'regimes',
    title: 'Same seed, two regimes',
    group: 'Compare',
    unit: '',
    note: 'The first chart compares this seed under fiat and under bitcoin. The charts below it are the fiat run only.',
    description:
      'CPI for this seed under fiat, in cents, and under bitcoin, in satoshis. The two lines use different units, so compare their shapes, not their heights. Every other slider stays as set. The charts below are the fiat run only.',
    lines: [
      checkedLine(
        result.ticks,
        'Fiat CPI (cents)',
        requireSeries(result.series, 'priceLevel'),
        '#246',
      ),
      checkedLine(
        result.ticks,
        'Bitcoin CPI (satoshis)',
        requireSeries(result.series, 'priceLevelBitcoin'),
        '#a60',
      ),
    ],
  };
}

function cpiBandView(result: BandRunResult, regime: string): ChartView {
  const band = result.bands.priceLevel;
  if (band === undefined) {
    throw new Error('Missing band priceLevel');
  }
  const scaled = scaleCents(moneyUnit(regime), [
    checkedLine(result.ticks, '5th', band.low, '#99b'),
    checkedLine(result.ticks, 'Median', band.mid, '#246'),
    checkedLine(result.ticks, '95th', band.high, '#99b'),
  ]);
  return {
    key: 'cpi-band',
    title: 'CPI band',
    group: 'Prices',
    unit: scaled.unit,
    description: 'Median CPI across five seeds, with the 5th and 95th percentiles.',
    lines: scaled.lines,
  };
}

function checkedLine(
  ticks: readonly number[],
  label: string,
  values: number[],
  color: string,
): ChartLine {
  if (values.length !== ticks.length) {
    throw new Error(`${label} has ${values.length} points for ${ticks.length} ticks`);
  }
  return { label, values, color };
}
