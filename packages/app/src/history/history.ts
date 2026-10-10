import { monthStart } from '../chart/time.js';
import type { ChartLine } from '../chart/view.js';
import { US_HISTORY, type HistoryMetricId } from './us-history-data.js';

/** Months of US data drawn before the run when history is on. */
export const HISTORY_MONTHS = 120;

/** Dash pattern for US history lines. */
export const HISTORY_DASH = [2, 3] as const;

/**
 * Metrics that plot as absolute indexes and must be scaled so the last
 * historical month matches the live run's opening value.
 */
export const REBASED_HISTORY_METRICS = new Set<HistoryMetricId>([
  'priceLevel',
  'priceFood',
  'priceHousing',
  'priceEnergy',
  'priceApparel',
  'priceTransportation',
  'priceMedical',
  'priceEducation',
  'priceRecreation',
  'priceElectronics',
  'realGdp',
  'moneySupply',
  'baseMoney',
  'totalRealWealth',
  'meanRealWealth',
  'meanWellbeing',
]);

const HISTORY_NOTE =
  'Dotted lines are the previous ten years of US data. Price levels, real GDP, money stocks, wealth, and mean well-being are scaled to this run’s opening level. Velocity is annual M2 velocity divided by 12. Labor share is annual through the latest Penn World Table year.';

const WELLBEING_HISTORY_NOTE =
  'US mean well-being is approximate: natural log of real PCE per capita plus 0.5 divided by one plus shelter CPI over all-items CPI, then scaled to this run’s opening level.';

/** Calendar month key `YYYY-MM` for `origin` plus `tick` months. */
export function calendarMonthKey(origin: Date, tick: number): string {
  const date = monthStart(origin, tick);
  const month = date.getMonth() + 1;
  return `${date.getFullYear()}-${String(month).padStart(2, '0')}`;
}

/** Raw history value for a metric on the calendar month of `origin` + `tick`, or null. */
export function historyValue(
  metricId: HistoryMetricId,
  origin: Date,
  tick: number,
): number | null {
  const key = calendarMonthKey(origin, tick);
  const value = US_HISTORY[metricId][key];
  return value === undefined ? null : value;
}

/** Run ticks with the 120 months before the run prepended. */
export function historyAxisTicks(runTicks: readonly number[]): number[] {
  const prefix: number[] = [];
  for (let tick = -HISTORY_MONTHS; tick < 0; tick += 1) {
    prefix.push(tick);
  }
  return [...prefix, ...runTicks];
}

/**
 * Pad a model series with nulls on the historical months, and nulls on
 * historical-only lines after the run starts.
 */
export function padHistoryValues(
  axisTicks: readonly number[],
  runValues: readonly (number | null)[],
  runTicks: readonly number[],
): (number | null)[] {
  const byTick = new Map<number, number | null>();
  for (let i = 0; i < runTicks.length; i += 1) {
    const tick = runTicks[i];
    if (tick === undefined) {
      continue;
    }
    byTick.set(tick, runValues[i] ?? null);
  }
  return axisTicks.map((tick) => byTick.get(tick) ?? null);
}

/** Last non-null history value in the months before the run, or null. */
export function lastHistoryValue(metricId: HistoryMetricId, origin: Date): number | null {
  for (let tick = -1; tick >= -HISTORY_MONTHS; tick -= 1) {
    const value = historyValue(metricId, origin, tick);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

/** History values on the axis: filled for ticks &lt; 0, null from tick 0 onward. */
export function historySeriesValues(
  metricId: HistoryMetricId,
  axisTicks: readonly number[],
  origin: Date,
  openModel: number | null = null,
): (number | null)[] {
  const rebase = REBASED_HISTORY_METRICS.has(metricId);
  let factor = 1;
  if (rebase) {
    if (openModel === null || !Number.isFinite(openModel)) {
      return axisTicks.map(() => null);
    }
    const lastHistory = lastHistoryValue(metricId, origin);
    if (lastHistory === null || lastHistory === 0) {
      return axisTicks.map(() => null);
    }
    factor = openModel / lastHistory;
  }
  return axisTicks.map((tick) => {
    if (tick >= 0) {
      return null;
    }
    const raw = historyValue(metricId, origin, tick);
    if (raw === null) {
      return null;
    }
    return rebase ? raw * factor : raw;
  });
}

export function historyLine(
  metricId: HistoryMetricId,
  label: string,
  color: string,
  axisTicks: readonly number[],
  origin: Date,
  openModel: number | null = null,
): ChartLine {
  return {
    label: `US ${label}`,
    values: historySeriesValues(metricId, axisTicks, origin, openModel),
    color,
    dash: HISTORY_DASH,
  };
}

export function isHistoryMetric(id: string): id is HistoryMetricId {
  return Object.hasOwn(US_HISTORY, id);
}

export function historyChartNote(): string {
  return HISTORY_NOTE;
}

/** Extra caption for the well-being chart when the US approximation is drawn. */
export function wellbeingHistoryNote(): string {
  return WELLBEING_HISTORY_NOTE;
}
