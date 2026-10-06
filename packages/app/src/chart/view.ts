import { CHART_PANELS, type ChartLineSpec, type ChartPanel } from '../dashboard/catalog.js';
import type { BandRunResult, RunSuccess } from '../worker/protocol.js';
import { readSeries } from '../worker/series.js';

export interface ChartLine {
  label: string;
  values: number[];
  color: string;
  /** Stroke dash segments for uPlot. Omit for a solid line. */
  dash?: readonly number[];
  /** Drawn, but left out of the legend. */
  omitLegend?: boolean;
  /** Lines with the same id share one legend item and one hover highlight. */
  pair?: string;
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

export function moneyUnit(regime: string): string {
  if (regime === 'fiat') {
    return 'cents';
  }
  if (regime === 'bitcoin' || regime === 'hybrid') {
    return 'satoshis';
  }
  throw new Error(`Unknown regime ${regime}`);
}

/** Dash pattern, in CSS pixels, for the variant line when a baseline is overlaid. */
export const VARIANT_DASH = [8, 6] as const;

export interface BaselineRun {
  result: RunSuccess;
  regime: string;
}

export function chartViews(
  result: RunSuccess,
  regime: string,
  baseline: BaselineRun | null = null,
): ChartView[] {
  if (result.ticks.length === 0) {
    throw new Error('Run has no ticks');
  }
  if (baseline !== null) {
    return pairedViews(result, regime, baseline);
  }
  const views = CHART_PANELS.map((spec) => viewFromSpec(spec, result, regime));
  if (result.kind === 'band') {
    const withBand = [...views];
    const pricesAt = withBand.findIndex((view) => view.key === 'prices');
    withBand.splice(pricesAt + 1, 0, cpiBandView(result, regime));
    return withBand;
  }
  return views;
}

/** Cents in one dollar. Display only; ledger amounts stay in cents. */
const CENTS_PER_DOLLAR = 100;
/** Fiat money charts stay in cents at this level and switch to dollars above it. */
const CENT_DISPLAY_MAX = 1_000;

function pairedViews(variant: RunSuccess, regime: string, baseline: BaselineRun): ChartView[] {
  if (baseline.result.ticks.length === 0) {
    throw new Error('Baseline run has no ticks');
  }
  if (baseline.result.ticks.length !== variant.ticks.length) {
    throw new Error('Baseline and variant must share the same month count');
  }
  return CHART_PANELS.map((spec) => pairedViewFromSpec(spec, variant, regime, baseline));
}

function viewFromSpec(spec: ChartPanel, result: RunSuccess, regime: string): ChartView {
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

function pairedViewFromSpec(
  spec: ChartPanel,
  variant: RunSuccess,
  regime: string,
  baseline: BaselineRun,
): ChartView {
  const mixedMoney = spec.unit === 'money' && moneyUnit(regime) !== moneyUnit(baseline.regime);
  const lines: ChartLine[] = [];
  for (const line of spec.lines) {
    lines.push(
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
    );
    lines.push(
      checkedLine(variant.ticks, line.label, readSeries(variant, line.id), line.color, {
        dash: VARIANT_DASH,
        pair: line.id,
      }),
    );
  }
  if (mixedMoney) {
    return {
      key: spec.key,
      title: spec.title,
      group: spec.group,
      unit: '',
      note: `Solid lines are the baseline, in ${moneyUnit(baseline.regime)}. Dashed lines are the variant, in ${moneyUnit(regime)}.`,
      description: spec.description,
      lines,
    };
  }
  const scaled = scaleCents(unitText(spec.unit, regime), lines);
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
  return 'log points';
}

function lineOf(result: RunSuccess, spec: ChartLineSpec): ChartLine {
  return checkedLine(result.ticks, spec.label, readSeries(result, spec.id), spec.color);
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
    description: 'Median CPI across these seeds, with the 5th and 95th percentiles.',
    lines: scaled.lines,
  };
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
  const line: ChartLine = { label, values, color };
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
