import { CHART_PANELS, type ChartLineSpec, type ChartPanel } from '../dashboard/catalog.js';
import {
  historyAxisTicks,
  historyChartNote,
  historyLine,
  isHistoryMetric,
  padHistoryValues,
  wellbeingHistoryNote,
} from '../history/history.js';
import type { BandRunResult, RunSuccess } from '../worker/protocol.js';
import { readSeries } from '../worker/series.js';
import { comparisonCaption, type CaptionSeries } from './caption.js';
import { hasMarks, MARKS_TIP, mergeMarks, runMarks, type ChartMarks } from './marks.js';

export interface ChartLine {
  label: string;
  values: (number | null)[];
  color: string;
  /** Stroke dash segments for uPlot. Omit for a solid line. */
  dash?: readonly number[];
  /** Drawn, but left out of the legend. */
  omitLegend?: boolean;
  /** Lines with the same id share one legend item and one hover highlight. */
  pair?: string;
  /** uPlot y-scale key. `y` is the left axis. */
  scale?: string;
  /** Display unit for this line when a chart has two money axes. */
  unit?: string;
}

export interface ChartView {
  key: string;
  title: string;
  unit: string;
  description: string;
  /** Horizontal axis months, including a negative history prefix when history is on. */
  ticks: number[];
  lines: ChartLine[];
  group: string;
  marks: ChartMarks;
  note?: string;
  /** Under a pinned baseline: how the scenario differs from the baseline. */
  caption?: string;
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

/** Dash pattern, in CSS pixels, for the scenario line when a baseline is overlaid. */
export const VARIANT_DASH = [8, 6] as const;

export interface BaselineRun {
  result: RunSuccess;
  regime: string;
  transitionLength: number;
}

export interface ChartViewOptions {
  /** Draw the previous ten years of US data before the run. */
  showHistory?: boolean;
  /** Calendar month of tick 0. Shared with the chart axis. */
  origin?: Date;
}

export function chartViews(
  result: RunSuccess,
  regime: string,
  baseline: BaselineRun | null = null,
  transitionLength = 0,
  options: ChartViewOptions = {},
): ChartView[] {
  if (result.ticks.length === 0) {
    throw new Error('Run has no ticks');
  }
  const showHistory = options.showHistory === true;
  const origin = options.origin ?? new Date();
  const axisTicks = showHistory ? historyAxisTicks(result.ticks) : [...result.ticks];
  if (baseline !== null) {
    return pairedViews(result, regime, baseline, transitionLength, axisTicks, showHistory, origin);
  }
  const marks = runMarks(result, transitionLength, 'solo');
  const views = CHART_PANELS.map((spec) =>
    viewFromSpec(spec, result, regime, marks, axisTicks, showHistory, origin),
  );
  if (result.kind === 'band') {
    const withBand = [...views];
    const pricesAt = withBand.findIndex((view) => view.key === 'prices');
    withBand.splice(
      pricesAt + 1,
      0,
      cpiBandView(result, regime, marks, axisTicks, showHistory, origin),
    );
    return withBand;
  }
  return views;
}

/** Cents in one dollar. Display only; ledger amounts stay in cents. */
const CENTS_PER_DOLLAR = 100;
/** Fiat money charts stay in cents at this level and switch to dollars above it. */
const CENT_DISPLAY_MAX = 1_000;
/** Left y-scale. Satoshis use a separate right-hand scale. */
const LEFT_SCALE = 'y';
const SATOSHI_SCALE = 'sats';

function pairedViews(
  variant: RunSuccess,
  regime: string,
  baseline: BaselineRun,
  transitionLength: number,
  axisTicks: number[],
  showHistory: boolean,
  origin: Date,
): ChartView[] {
  if (baseline.result.ticks.length === 0) {
    throw new Error('Baseline run has no ticks');
  }
  if (baseline.result.ticks.length !== variant.ticks.length) {
    throw new Error('Baseline and scenario must share the same month count');
  }
  const marks = mergeMarks(
    runMarks(baseline.result, baseline.transitionLength, 'baseline'),
    runMarks(variant, transitionLength, 'variant'),
  );
  return CHART_PANELS.map((spec) =>
    pairedViewFromSpec(spec, variant, regime, baseline, marks, axisTicks, showHistory, origin),
  );
}

function viewFromSpec(
  spec: ChartPanel,
  result: RunSuccess,
  regime: string,
  marks: ChartMarks,
  axisTicks: number[],
  showHistory: boolean,
  origin: Date,
): ChartView {
  const modelLines = spec.lines.map((line) =>
    padModelLine(lineOf(result, line), axisTicks, result.ticks),
  );
  const historyLines = showHistory
    ? historyLinesFor(spec, result, axisTicks, origin)
    : [];
  const scaled = scaleCents(unitText(spec.unit, regime), [...modelLines, ...historyLines]);
  const view: ChartView = {
    key: spec.key,
    title: spec.title,
    group: spec.group,
    unit: scaled.unit,
    description: withMarksTip(spec.description, marks),
    ticks: axisTicks,
    lines: scaled.lines,
    marks,
  };
  if (historyLines.length > 0) {
    view.note =
      spec.key === 'wellbeing'
        ? `${historyChartNote()} ${wellbeingHistoryNote()}`
        : historyChartNote();
  }
  return view;
}

function pairedViewFromSpec(
  spec: ChartPanel,
  variant: RunSuccess,
  regime: string,
  baseline: BaselineRun,
  marks: ChartMarks,
  axisTicks: number[],
  showHistory: boolean,
  origin: Date,
): ChartView {
  const baselineMoney = moneyUnit(baseline.regime);
  const variantMoney = moneyUnit(regime);
  const mixedMoney = spec.unit === 'money' && baselineMoney !== variantMoney;
  const rows: MoneyLine[] = [];
  for (const line of spec.lines) {
    rows.push({
      line: padModelLine(
        checkedLine(
          baseline.result.ticks,
          line.label,
          readSeries(baseline.result, line.id),
          line.color,
          {
            omitLegend: true,
            pair: line.id,
          },
        ),
        axisTicks,
        baseline.result.ticks,
      ),
      money: baselineMoney,
    });
    rows.push({
      line: padModelLine(
        checkedLine(variant.ticks, line.label, readSeries(variant, line.id), line.color, {
          dash: VARIANT_DASH,
          pair: line.id,
        }),
        axisTicks,
        variant.ticks,
      ),
      money: variantMoney,
    });
  }
  const historyLines = showHistory
    ? historyLinesFor(spec, variant, axisTicks, origin)
    : [];
  if (mixedMoney) {
    const mixed = mixedMoneyView(spec, rows, marks, axisTicks);
    if (historyLines.length > 0) {
      mixed.lines = [...mixed.lines, ...historyLines];
      mixed.note = `${mixed.note ?? ''} ${historyChartNote()}`.trim();
    }
    return mixed;
  }
  const lines = [...rows.map((row) => row.line), ...historyLines];
  const scaled = scaleCents(unitText(spec.unit, regime), lines);
  const view: ChartView = {
    key: spec.key,
    title: spec.title,
    group: spec.group,
    unit: scaled.unit,
    description: withMarksTip(spec.description, marks),
    ticks: axisTicks,
    lines: scaled.lines,
    marks,
    caption: comparisonCaption(captionSeries(spec.lines, scaled.lines)),
  };
  if (historyLines.length > 0) {
    view.note =
      spec.key === 'wellbeing'
        ? `${historyChartNote()} ${wellbeingHistoryNote()}`
        : historyChartNote();
  }
  return view;
}

interface MoneyLine {
  line: ChartLine;
  money: string;
}

function mixedMoneyView(
  spec: ChartPanel,
  rows: readonly MoneyLine[],
  marks: ChartMarks,
  axisTicks: number[],
): ChartView {
  const fiatLines = rows.filter((row) => row.money === 'cents').map((row) => row.line);
  const fiatUnit = peakAbs(fiatLines) > CENT_DISPLAY_MAX ? 'dollars' : 'cents';
  const lines = rows.map((row) => placeMoneyLine(row, fiatUnit));
  const baselineUnit = rows[0]?.money === 'cents' ? fiatUnit : 'satoshis';
  const variantUnit = rows[1]?.money === 'cents' ? fiatUnit : 'satoshis';
  return {
    key: spec.key,
    title: spec.title,
    group: spec.group,
    unit: '',
    note: `Solid lines are the baseline, in ${baselineUnit} (${axisName(baselineUnit)} axis). Dashed lines are the scenario, in ${variantUnit} (${axisName(variantUnit)} axis).`,
    description: withMarksTip(spec.description, marks),
    ticks: axisTicks,
    lines,
    marks,
    caption: comparisonCaption([], { mixedUnits: true }),
  };
}

function placeMoneyLine(row: MoneyLine, fiatUnit: string): ChartLine {
  const fiat = row.money === 'cents';
  const line: ChartLine = {
    ...row.line,
    scale: fiat ? LEFT_SCALE : SATOSHI_SCALE,
    unit: fiat ? fiatUnit : 'satoshis',
  };
  if (fiat && fiatUnit === 'dollars') {
    line.values = row.line.values.map((value) =>
      value === null ? null : value / CENTS_PER_DOLLAR,
    );
  }
  return line;
}

function axisName(unit: string): 'left' | 'right' {
  return unit === 'satoshis' ? 'right' : 'left';
}

function captionSeries(
  specs: readonly ChartLineSpec[],
  lines: readonly ChartLine[],
): CaptionSeries[] {
  return specs.map((spec) => {
    const baseline = lines.find((line) => line.pair === spec.id && line.omitLegend === true);
    const variant = lines.find((line) => line.pair === spec.id && line.omitLegend !== true);
    if (baseline === undefined || variant === undefined) {
      throw new Error(`Missing paired lines for ${spec.label}`);
    }
    const series: CaptionSeries = {
      label: spec.label,
      baseline: finiteSeries(baseline.values),
      variant: finiteSeries(variant.values),
    };
    if (spec.better !== undefined) {
      series.better = spec.better;
    }
    return series;
  });
}

/** Captions score the run months only; history nulls are dropped. */
function finiteSeries(values: readonly (number | null)[]): number[] {
  return values.filter((value): value is number => value !== null && Number.isFinite(value));
}

function withMarksTip(description: string, marks: ChartMarks): string {
  if (!hasMarks(marks)) {
    return description;
  }
  return `${description} ${MARKS_TIP}`;
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
      if (value !== null && Number.isFinite(value)) {
        peak = Math.max(peak, Math.abs(value));
      }
    }
  }
  return peak;
}

function asDollars(line: ChartLine): ChartLine {
  return {
    ...line,
    values: line.values.map((value) => (value === null ? null : value / CENTS_PER_DOLLAR)),
  };
}

function unitText(unit: ChartPanel['unit'], regime: string): string {
  if (unit === 'money') {
    return moneyUnit(regime);
  }
  if (unit === 'share') {
    return 'share';
  }
  if (unit === 'output') {
    return 'real units';
  }
  if (unit === 'count') {
    return 'count';
  }
  if (unit === 'index') {
    return 'index';
  }
  if (unit === 'months') {
    return 'months of income';
  }
  return 'log points';
}

function lineOf(result: RunSuccess, spec: ChartLineSpec): ChartLine {
  return checkedLine(result.ticks, spec.label, readSeries(result, spec.id), spec.color);
}

function padModelLine(
  line: ChartLine,
  axisTicks: readonly number[],
  runTicks: readonly number[],
): ChartLine {
  if (axisTicks.length === runTicks.length) {
    return line;
  }
  return {
    ...line,
    values: padHistoryValues(axisTicks, line.values, runTicks),
  };
}

function historyLinesFor(
  spec: ChartPanel,
  result: RunSuccess,
  axisTicks: readonly number[],
  origin: Date,
): ChartLine[] {
  const lines: ChartLine[] = [];
  for (const line of spec.lines) {
    if (!isHistoryMetric(line.id)) {
      continue;
    }
    const model = readSeries(result, line.id);
    const open = model[0] ?? null;
    lines.push(historyLine(line.id, line.label, line.color, axisTicks, origin, open));
  }
  return lines;
}

function cpiBandView(
  result: BandRunResult,
  regime: string,
  marks: ChartMarks,
  axisTicks: number[],
  showHistory: boolean,
  origin: Date,
): ChartView {
  const band = result.bands.priceLevel;
  if (band === undefined) {
    throw new Error('Missing band priceLevel');
  }
  const modelLines = [
    padModelLine(
      checkedLine(result.ticks, '5th', band.low, '#99b'),
      axisTicks,
      result.ticks,
    ),
    padModelLine(
      checkedLine(result.ticks, 'Median', band.mid, '#246'),
      axisTicks,
      result.ticks,
    ),
    padModelLine(
      checkedLine(result.ticks, '95th', band.high, '#99b'),
      axisTicks,
      result.ticks,
    ),
  ];
  const historyLines =
    showHistory
      ? [historyLine('priceLevel', 'CPI', '#246', axisTicks, origin, band.mid[0] ?? null)]
      : [];
  const scaled = scaleCents(moneyUnit(regime), [...modelLines, ...historyLines]);
  const view: ChartView = {
    key: 'cpi-band',
    title: 'CPI band',
    group: 'Prices',
    unit: scaled.unit,
    description: withMarksTip(
      'Median CPI across these seeds, with the 5th and 95th percentiles.',
      marks,
    ),
    ticks: axisTicks,
    lines: scaled.lines,
    marks,
  };
  if (historyLines.length > 0) {
    view.note = historyChartNote();
  }
  return view;
}

function checkedLine(
  ticks: readonly number[],
  label: string,
  values: number[],
  color: string,
  options?: { dash?: readonly number[]; omitLegend?: boolean; pair?: string },
): ChartLine {
  if (values.length !== ticks.length) {
    throw new Error(`${label} has ${values.length} points for ${ticks.length} ticks`);
  }
  const line: ChartLine = { label, values: [...values], color };
  if (options?.dash !== undefined) {
    line.dash = options.dash;
  }
  if (options?.omitLegend === true) {
    line.omitLegend = true;
  }
  if (options?.pair !== undefined) {
    line.pair = options.pair;
  }
  return line;
}
