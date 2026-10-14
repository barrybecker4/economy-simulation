import { CHART_PANELS } from '../dashboard/catalog.js';
import { plainComparisonCaption } from '../chart/plain-caption.js';
import type { ChartLine, ChartView } from '../chart/view.js';
import type { MetricId } from '../../../core/src/metrics/metrics.js';
import type { Lesson, LessonChartSpec } from './lessons.js';

/** Keep only the lesson's charts, with student titles and plain captions. */
export function presentLessonCharts(views: readonly ChartView[], lesson: Lesson): ChartView[] {
  return lesson.charts.map((spec) => presentOne(views, spec));
}

function presentOne(views: readonly ChartView[], spec: LessonChartSpec): ChartView {
  const view = views.find((item) => item.key === spec.key);
  if (view === undefined) {
    throw new Error(`Missing chart ${spec.key} for the lesson`);
  }
  const lines = filterLines(view, spec);
  const caption = plainCaptionFor(view, lines, spec);
  const next: ChartView = {
    key: view.key,
    title: spec.title,
    unit: view.unit,
    description: spec.description,
    ticks: view.ticks,
    lines,
    group: 'Lesson',
    marks: view.marks,
  };
  if (view.logToggle === true) {
    next.logToggle = true;
  }
  if (caption !== undefined) {
    next.caption = caption;
  }
  return next;
}

function filterLines(view: ChartView, spec: LessonChartSpec): ChartLine[] {
  if (spec.lineIds === undefined) {
    return view.lines;
  }
  const ids = new Set<string>(spec.lineIds);
  const labels = labelsFor(spec.key, spec.lineIds);
  return view.lines.filter((line) => {
    if (line.pair !== undefined) {
      return ids.has(line.pair);
    }
    return labels.has(line.label);
  });
}

function labelsFor(chartKey: string, lineIds: readonly MetricId[]): Set<string> {
  const panel = CHART_PANELS.find((item) => item.key === chartKey);
  if (panel === undefined) {
    return new Set();
  }
  const ids = new Set<string>(lineIds);
  return new Set(panel.lines.filter((line) => ids.has(line.id)).map((line) => line.label));
}

function plainCaptionFor(
  view: ChartView,
  lines: readonly ChartLine[],
  spec: LessonChartSpec,
): string | undefined {
  if (view.caption === undefined || view.caption.length === 0) {
    return undefined;
  }
  const panel = CHART_PANELS.find((item) => item.key === spec.key);
  if (panel === undefined) {
    return view.caption;
  }
  const specs =
    spec.lineIds === undefined
      ? panel.lines
      : panel.lines.filter((line) => spec.lineIds?.includes(line.id));
  const series = [];
  for (const lineSpec of specs) {
    const baseline = lines.find((line) => line.pair === lineSpec.id && line.omitLegend === true);
    const variant = lines.find((line) => line.pair === lineSpec.id && line.omitLegend !== true);
    if (baseline === undefined || variant === undefined) {
      continue;
    }
    series.push({
      label: lineSpec.label,
      baseline: finiteSeries(baseline.values),
      variant: finiteSeries(variant.values),
    });
  }
  if (series.length === 0) {
    return undefined;
  }
  return plainComparisonCaption(series);
}

function finiteSeries(values: readonly (number | null)[]): number[] {
  return values.filter((value): value is number => value !== null && Number.isFinite(value));
}
