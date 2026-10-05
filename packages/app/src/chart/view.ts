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
  unit: 'money' | 'share' | 'log';
  description: string;
  lines: readonly LineSpec[];
}

const SPECS: readonly ChartSpec[] = [
  {
    key: 'wellbeing',
    title: 'Well-being',
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
    unit: 'money',
    description:
      'Monthly UBI outlay. The pool is the UBI share slider times the AI share of output times nominal GDP, split equally across households. It starts at zero when AI capacity is not adopted.',
    lines: [{ id: 'ubiOutlay', label: 'UBI outlay', color: '#047857' }],
  },
  {
    key: 'credit',
    title: 'Credit to GDP',
    unit: 'share',
    description:
      "Private credit relative to annualized nominal GDP: firm and household loans divided by twelve times this month's nominal output. Government bonds are not in this ratio. A five-seed band draws the median.",
    lines: [{ id: 'creditToGdp', label: 'Credit to GDP', color: '#7c3aed' }],
  },
  {
    key: 'ai',
    title: 'AI',
    unit: 'share',
    description:
      'Tasks automated is the share of tasks software can do. AI agents is autonomous agents divided by households plus agents. AI share of output is the fraction of capacity from the AI multiplier. With equal start and end automatable shares that share stays at zero. A five-seed band draws each median.',
    lines: [
      { id: 'tasksAutomated', label: 'Tasks automated', color: '#0f766e' },
      { id: 'aiShareOfAgents', label: 'AI agents', color: '#a21caf' },
      { id: 'aiShareOfOutput', label: 'AI share of output', color: '#c2410c' },
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
    return [...views, cpiBandView(result, displayed)];
  }
  return views;
}

function viewFromSpec(spec: ChartSpec, result: RunSuccess, regime: string): ChartView {
  return {
    key: spec.key,
    title: spec.title,
    unit: unitText(spec.unit, regime),
    description: spec.description,
    lines: spec.lines.map((line) => lineOf(result, line)),
  };
}

function unitText(unit: ChartSpec['unit'], regime: string): string {
  if (unit === 'money') {
    return moneyUnit(regime);
  }
  if (unit === 'share') {
    return 'share';
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
  return {
    key: 'cpi-band',
    title: 'CPI band',
    unit: moneyUnit(regime),
    description: 'Median CPI across five seeds, with the 5th and 95th percentiles.',
    lines: [
      checkedLine(result.ticks, '5th', band.low, '#99b'),
      checkedLine(result.ticks, 'Median', band.mid, '#246'),
      checkedLine(result.ticks, '95th', band.high, '#99b'),
    ],
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
