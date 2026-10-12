import { CHART_PANELS, type ChartLineSpec, type ChartPanel } from '../dashboard/catalog.js';
import {
  HISTORY_DASH,
  historyAxisTicks,
  historyChartNote,
  historyLine,
  historyPriceLevelsForMetric,
  historySeriesValues,
  isHistoryMetric,
  padHistoryValues,
  rebasedHistoryPriceLevels,
  wellbeingHistoryNote,
} from '../history/history.js';
import type { HistoryMetricId } from '../history/us-history-data.js';
import type { BandRunResult, RunSuccess } from '../worker/protocol.js';
import { readSeries } from '../worker/series.js';
import { comparisonCaption, type CaptionSeries } from './caption.js';
import { hasMarks, MARKS_TIP, mergeMarks, runMarks, type ChartMarks } from './marks.js';
import {
  type DollarBasis,
  displayMoneySeries,
  livingStandardsDescription,
  moneyDisplayUnit,
  moneyLineLabel,
  moneyUnit,
  needsPriceLevel,
  pricesDescription,
  wealthDescription,
} from './money-display.js';

export type { DollarBasis } from './money-display.js';
export { moneyUnit } from './money-display.js';

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
  /** When true, the chart offers a log-scale checkbox for the y-axis. */
  logToggle?: boolean;
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
  /** Nominal or opening-month dollars. Ignored for bitcoin-only charts. */
  dollarBasis?: DollarBasis;
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
  const dollarBasis = options.dollarBasis ?? 'nominal';
  const axisTicks = showHistory ? historyAxisTicks(result.ticks) : [...result.ticks];
  if (baseline !== null) {
    return pairedViews(
      result,
      regime,
      baseline,
      transitionLength,
      axisTicks,
      showHistory,
      origin,
      dollarBasis,
    );
  }
  const marks = runMarks(result, transitionLength, 'solo');
  const views = CHART_PANELS.map((spec) =>
    viewFromSpec(spec, result, regime, marks, axisTicks, showHistory, origin, dollarBasis),
  );
  if (result.kind === 'band') {
    const withBand = [...views];
    const pricesAt = withBand.findIndex((view) => view.key === 'prices');
    withBand.splice(
      pricesAt + 1,
      0,
      cpiBandView(result, regime, marks, axisTicks, showHistory, origin, dollarBasis),
    );
    return withBand;
  }
  return views;
}

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
  dollarBasis: DollarBasis,
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
    pairedViewFromSpec(
      spec,
      variant,
      regime,
      baseline,
      marks,
      axisTicks,
      showHistory,
      origin,
      dollarBasis,
    ),
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
  dollarBasis: DollarBasis,
): ChartView {
  const prices = paddedPriceLevels(result, axisTicks);
  const openingPrice = openingPriceLevel(result);
  const modelLines = spec.lines.map((line) => {
    const padded = padModelLine(lineOf(result, line), axisTicks, result.ticks);
    if (spec.unit !== 'money') {
      return padded;
    }
    return convertMoneyLine(padded, line.id, regime, dollarBasis, prices, openingPrice);
  });
  const historyLines = showHistory
    ? historyLinesFor(spec, result, axisTicks, origin, regime, dollarBasis)
    : [];
  const view: ChartView = {
    key: spec.key,
    title: spec.title,
    group: spec.group,
    unit: unitText(spec.unit, regime, dollarBasis),
    description: withMarksTip(panelDescription(spec, regime, dollarBasis), marks),
    ticks: axisTicks,
    lines: [...modelLines, ...historyLines],
    marks,
    ...logToggleField(spec),
  };
  if (historyLines.length > 0) {
    view.note =
      spec.key === 'wellbeing'
        ? `${historyChartNote()} ${wellbeingHistoryNote()}`
        : historyChartNote();
  }
  return view;
}

function panelDescription(
  spec: ChartPanel,
  regime: string,
  dollarBasis: DollarBasis,
): string {
  if (spec.key === 'living') {
    return livingStandardsDescription(dollarBasis, regime);
  }
  if (spec.key === 'prices' || spec.key === 'cpi-band') {
    return pricesDescription(dollarBasis, regime);
  }
  if (spec.key === 'total-wealth') {
    return wealthDescription('total', dollarBasis, regime);
  }
  if (spec.key === 'typical-wealth') {
    return wealthDescription('typical', dollarBasis, regime);
  }
  return spec.description;
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
  dollarBasis: DollarBasis,
): ChartView {
  const baselineMoney = moneyUnit(baseline.regime);
  const variantMoney = moneyUnit(regime);
  const mixedMoney = spec.unit === 'money' && baselineMoney !== variantMoney;
  const baselinePrices = paddedPriceLevels(baseline.result, axisTicks);
  const variantPrices = paddedPriceLevels(variant, axisTicks);
  const baselineOpen = openingPriceLevel(baseline.result);
  const variantOpen = openingPriceLevel(variant);
  const rows: MoneyLine[] = [];
  for (const line of spec.lines) {
    const baselineRaw = padModelLine(
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
    );
    const variantRaw = padModelLine(
      checkedLine(variant.ticks, line.label, readSeries(variant, line.id), line.color, {
        dash: VARIANT_DASH,
        pair: line.id,
      }),
      axisTicks,
      variant.ticks,
    );
    if (spec.unit === 'money') {
      rows.push({
        line: convertMoneyLine(
          baselineRaw,
          line.id,
          baseline.regime,
          dollarBasis,
          baselinePrices,
          baselineOpen,
        ),
        money: baselineMoney,
        displayUnit: moneyDisplayUnit(baseline.regime, dollarBasis),
      });
      rows.push({
        line: convertMoneyLine(
          variantRaw,
          line.id,
          regime,
          dollarBasis,
          variantPrices,
          variantOpen,
        ),
        money: variantMoney,
        displayUnit: moneyDisplayUnit(regime, dollarBasis),
      });
    } else {
      rows.push({ line: baselineRaw, money: baselineMoney, displayUnit: baselineMoney });
      rows.push({ line: variantRaw, money: variantMoney, displayUnit: variantMoney });
    }
  }
  const historyLines = showHistory
    ? historyLinesFor(spec, variant, axisTicks, origin, regime, dollarBasis)
    : [];
  if (mixedMoney) {
    const mixed = mixedMoneyView(spec, rows, marks, axisTicks, regime, dollarBasis);
    if (historyLines.length > 0) {
      mixed.lines = [...mixed.lines, ...historyLines];
      mixed.note = `${mixed.note ?? ''} ${historyChartNote()}`.trim();
    }
    return mixed;
  }
  const lines = [...rows.map((row) => row.line), ...historyLines];
  const view: ChartView = {
    key: spec.key,
    title: spec.title,
    group: spec.group,
    unit: unitText(spec.unit, regime, dollarBasis),
    description: withMarksTip(panelDescription(spec, regime, dollarBasis), marks),
    ticks: axisTicks,
    lines,
    marks,
    caption: comparisonCaption(captionSeries(spec.lines, lines, dollarBasis, regime)),
    ...logToggleField(spec),
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
  money: 'cents' | 'satoshis';
  displayUnit: string;
}

function mixedMoneyView(
  spec: ChartPanel,
  rows: readonly MoneyLine[],
  marks: ChartMarks,
  axisTicks: number[],
  regime: string,
  dollarBasis: DollarBasis,
): ChartView {
  const lines = rows.map((row) => placeMoneyLine(row));
  const baselineUnit = rows[0]?.displayUnit ?? 'dollars';
  const variantUnit = rows[1]?.displayUnit ?? 'satoshis';
  return {
    key: spec.key,
    title: spec.title,
    group: spec.group,
    unit: '',
    note: `Solid lines are the baseline, in ${baselineUnit} (${axisName(baselineUnit)} axis). Dashed lines are the scenario, in ${variantUnit} (${axisName(variantUnit)} axis).`,
    description: withMarksTip(panelDescription(spec, regime, dollarBasis), marks),
    ticks: axisTicks,
    lines,
    marks,
    caption: comparisonCaption([], { mixedUnits: true }),
    ...logToggleField(spec),
  };
}

function placeMoneyLine(row: MoneyLine): ChartLine {
  const fiat = row.money === 'cents';
  return {
    ...row.line,
    scale: fiat ? LEFT_SCALE : SATOSHI_SCALE,
    unit: row.displayUnit,
  };
}

function axisName(unit: string): 'left' | 'right' {
  return unit === 'satoshis' ? 'right' : 'left';
}

function captionSeries(
  specs: readonly ChartLineSpec[],
  lines: readonly ChartLine[],
  dollarBasis: DollarBasis,
  regime: string,
): CaptionSeries[] {
  return specs.map((spec) => {
    const baseline = lines.find((line) => line.pair === spec.id && line.omitLegend === true);
    const variant = lines.find((line) => line.pair === spec.id && line.omitLegend !== true);
    if (baseline === undefined || variant === undefined) {
      throw new Error(`Missing paired lines for ${spec.label}`);
    }
    const series: CaptionSeries = {
      label: moneyLineLabel(spec.label, dollarBasis, regime),
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

function convertMoneyLine(
  line: ChartLine,
  metricId: string,
  regime: string,
  basis: DollarBasis,
  priceLevels: readonly (number | null)[],
  openingPrice: number,
): ChartLine {
  return {
    ...line,
    label: moneyLineLabel(line.label, basis, regime),
    values: displayMoneySeries(line.values, metricId, regime, basis, priceLevels, openingPrice),
  };
}

function openingPriceLevel(result: RunSuccess): number {
  const prices = readSeries(result, 'priceLevel');
  for (const open of prices) {
    if (Number.isFinite(open) && open > 0) {
      return open;
    }
  }
  throw new Error('Missing opening priceLevel');
}

function paddedPriceLevels(result: RunSuccess, axisTicks: readonly number[]): (number | null)[] {
  return padHistoryValues(axisTicks, readSeries(result, 'priceLevel'), result.ticks);
}

function logToggleField(spec: ChartPanel): { logToggle?: true } {
  return spec.logToggle === true ? { logToggle: true } : {};
}

function unitText(unit: ChartPanel['unit'], regime: string, basis: DollarBasis): string {
  if (unit === 'money') {
    return moneyDisplayUnit(regime, basis);
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
  regime: string,
  dollarBasis: DollarBasis,
): ChartLine[] {
  const lines: ChartLine[] = [];
  const openPrice = openingPriceLevel(result);
  for (const line of spec.lines) {
    if (!isHistoryMetric(line.id)) {
      continue;
    }
    const model = readSeries(result, line.id);
    const open = model[0] ?? null;
    const label = moneyLineLabel(line.label, dollarBasis, regime);
    if (spec.unit !== 'money') {
      lines.push(historyLine(line.id, label, line.color, axisTicks, origin, open));
      continue;
    }
    const metricId = line.id as HistoryMetricId;
    const historyPrices = needsPriceLevel(line.id)
      ? historyPriceLevelsForMetric(metricId, axisTicks, origin, openPrice)
      : rebasedHistoryPriceLevels(axisTicks, origin, openPrice);
    const raw = historySeriesValues(line.id, axisTicks, origin, open);
    lines.push({
      label: `US ${label}`,
      values: displayMoneySeries(raw, line.id, regime, dollarBasis, historyPrices, openPrice),
      color: line.color,
      dash: HISTORY_DASH,
    });
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
  dollarBasis: DollarBasis,
): ChartView {
  const band = result.bands.priceLevel;
  if (band === undefined) {
    throw new Error('Missing band priceLevel');
  }
  const prices = padHistoryValues(axisTicks, band.mid, result.ticks);
  const openingPrice = band.mid[0];
  if (openingPrice === undefined || !(openingPrice > 0)) {
    throw new Error('Missing opening CPI band median');
  }
  const modelLines = [
    convertMoneyLine(
      padModelLine(checkedLine(result.ticks, '5th', band.low, '#99b'), axisTicks, result.ticks),
      'priceLevel',
      regime,
      dollarBasis,
      prices,
      openingPrice,
    ),
    convertMoneyLine(
      padModelLine(checkedLine(result.ticks, 'Median', band.mid, '#246'), axisTicks, result.ticks),
      'priceLevel',
      regime,
      dollarBasis,
      prices,
      openingPrice,
    ),
    convertMoneyLine(
      padModelLine(checkedLine(result.ticks, '95th', band.high, '#99b'), axisTicks, result.ticks),
      'priceLevel',
      regime,
      dollarBasis,
      prices,
      openingPrice,
    ),
  ];
  const historyLines = showHistory
    ? historyLinesFor(
        {
          key: 'cpi-band',
          title: 'CPI band',
          group: 'Prices',
          unit: 'money',
          description: '',
          lines: [{ id: 'priceLevel', label: 'CPI', color: '#246' }],
        },
        result,
        axisTicks,
        origin,
        regime,
        dollarBasis,
      )
    : [];
  const view: ChartView = {
    key: 'cpi-band',
    title: 'CPI band',
    group: 'Prices',
    unit: moneyDisplayUnit(regime, dollarBasis),
    description: withMarksTip(
      `${pricesDescription(dollarBasis, regime)} Median CPI across these seeds, with the 5th and 95th percentiles.`,
      marks,
    ),
    ticks: axisTicks,
    lines: [...modelLines, ...historyLines],
    marks,
    logToggle: true,
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
