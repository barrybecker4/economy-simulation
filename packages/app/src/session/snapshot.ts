import type { MetricId } from '../../../core/src/metrics/metrics.js';
import { plainRatioWords } from '../chart/plain-caption.js';
import type { RunSuccess } from '../worker/protocol.js';
import { metricAt, readSeries } from '../worker/series.js';
import type { Lesson, LessonSnapshotMetric } from './lessons.js';

/** Months shown on the classroom snapshot card. */
export const SNAPSHOT_MONTHS = [0, 60] as const;

export interface SnapshotPoint {
  month: number;
  value: number;
}

export interface SnapshotRow {
  id: MetricId;
  label: string;
  points: SnapshotPoint[];
  /** Last month relative to the opening month, in plain words. */
  changeWords: string;
}

export interface SnapshotCard {
  rows: SnapshotRow[];
  /** Typical-household paragraph when the lesson asks for one. */
  typicalHousehold: string | null;
}

/** Build the classroom snapshot from a finished run. */
export function lessonSnapshot(result: RunSuccess, lesson: Lesson): SnapshotCard {
  const lastMonth = Math.max(0, result.ticks.length - 1);
  const months = [...SNAPSHOT_MONTHS, lastMonth].filter(
    (month, index, all) => month <= lastMonth && all.indexOf(month) === index,
  );
  const rows = lesson.snapshotMetrics.map((metric) => rowFor(result, metric, months));
  return {
    rows,
    typicalHousehold: lesson.typicalHousehold ? typicalHouseholdParagraph(result, lastMonth) : null,
  };
}

function rowFor(
  result: RunSuccess,
  metric: LessonSnapshotMetric,
  months: readonly number[],
): SnapshotRow {
  const opening = metricAt(result, metric.id, 0);
  const ending = metricAt(result, metric.id, months[months.length - 1] ?? 0);
  return {
    id: metric.id,
    label: metric.label,
    points: months.map((month) => ({
      month,
      value: metricAt(result, metric.id, month),
    })),
    changeWords: plainRatioWords(opening, ending),
  };
}

function typicalHouseholdParagraph(result: RunSuccess, lastMonth: number): string {
  const incomeOpen = metricAt(result, 'medianRealIncome', 0);
  const incomeEnd = metricAt(result, 'medianRealIncome', lastMonth);
  const cpiOpen = metricAt(result, 'priceLevel', 0);
  const cpiEnd = metricAt(result, 'priceLevel', lastMonth);
  const housingOpen = metricAt(result, 'priceHousing', 0);
  const housingEnd = metricAt(result, 'priceHousing', lastMonth);
  const incomeWords = plainRatioWords(incomeOpen, incomeEnd);
  const housingVsCpi =
    ratio(housingOpen, housingEnd) > ratio(cpiOpen, cpiEnd) * 1.02
      ? 'Housing rose faster than the average basket'
      : ratio(housingOpen, housingEnd) < ratio(cpiOpen, cpiEnd) * 0.98
        ? 'Housing rose slower than the average basket'
        : 'Housing moved with the average basket';
  return `A typical household’s real income ends ${incomeWords}. ${housingVsCpi}.`;
}

function ratio(from: number, to: number): number {
  if (!Number.isFinite(from) || !Number.isFinite(to) || nearlyZero(from)) {
    return 1;
  }
  return to / from;
}

function nearlyZero(value: number): boolean {
  return Math.abs(value) <= 1e-9;
}

/**
 * Ending direction of one metric versus a baseline run, for prediction feedback.
 * When relativeBand is set (e.g. 0.02), a gap within that fraction of the baseline counts as same.
 */
export function endingDirection(
  baseline: RunSuccess,
  variant: RunSuccess,
  id: MetricId,
  relativeBand = 0,
): 'higher' | 'lower' | 'same' {
  const from = lastOf(readSeries(baseline, id));
  const to = lastOf(readSeries(variant, id));
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return 'same';
  }
  if (relativeBand > 0 && from > 0) {
    if (Math.abs(to / from - 1) <= relativeBand) {
      return 'same';
    }
  }
  const gap = Math.abs(to - from);
  if (gap <= Math.max(1e-9, 1e-6 * Math.max(Math.abs(from), Math.abs(to)))) {
    return 'same';
  }
  return to > from ? 'higher' : 'lower';
}

function lastOf(values: readonly number[]): number {
  const value = values[values.length - 1];
  if (value === undefined) {
    throw new Error('Series has no points');
  }
  return value;
}
