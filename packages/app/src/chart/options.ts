import type uPlot from 'uplot';
import { monthAxisSeconds } from './time.js';
import {
  eventsAt,
  emptyMarks,
  hasMarks,
  type ChartEvent,
  type ChartMarks,
  type MarkStyle,
} from './marks.js';

const CHART_HEIGHT = 240;
const Y_AXIS_MIN = 52;
const Y_AXIS_CHAR = 7;
/** uPlot axis side for the right-hand scale. */
const AXIS_RIGHT = 1 as const;
const LEFT_SCALE = 'y';
const BAND_ALPHA = 0.22;
const HATCH_FILL_ALPHA = 0.12;
const HATCH_LINE_ALPHA = 0.55;
const RULE_ALPHA = 0.9;

export interface PlotLine {
  label: string;
  color: string;
  values?: readonly number[];
  dash?: readonly number[];
  omitLegend?: boolean;
  pair?: string;
  /** uPlot y-scale key. `y` is the left axis. Another key draws a right axis. */
  scale?: string;
  /** Unit drawn on that scale's axis, and in the legend when a pair disagrees. */
  unit?: string;
}

interface FocusedSeries extends uPlot.Series {
  _focus?: boolean | null;
  _paths?: { stroke?: Path2D | null } | null;
}

/** Chart surface color. The scenario dash is outlined in this so it reads against a same-color solid line. */
const CHART_SURFACE = '#fff';

export interface PlottableLine extends PlotLine {
  values: readonly number[];
}

/** One plot: identity, uPlot options, and aligned data, including paired-legend behavior. */
export function buildPlot(
  width: number,
  ticks: readonly number[],
  lines: readonly PlottableLine[],
  origin: Date,
  marks: ChartMarks = emptyMarks(),
): { key: string; options: ReturnType<typeof plotOptions>; data: uPlot.AlignedData } {
  return {
    key: chartKey(width, ticks, lines, marks),
    options: plotOptions(width, lines, marks),
    data: plotData(ticks, lines, origin),
  };
}

function chartKey(
  width: number,
  ticks: readonly number[],
  lines: readonly PlottableLine[],
  marks: ChartMarks,
): string {
  return JSON.stringify([
    width,
    ticks,
    lines.map((line) => [
      line.label,
      line.color,
      line.dash ?? null,
      line.omitLegend === true,
      line.pair ?? null,
      line.scale ?? null,
      line.unit ?? null,
      line.values,
    ]),
    marks,
  ]);
}

export function plotOptions(
  width: number,
  lines: readonly PlotLine[],
  marks: ChartMarks = emptyMarks(),
) {
  const paired = lines.some((line) => line.pair !== undefined);
  const marked = hasMarks(marks);
  const rightScale = lines.find(
    (line) => line.scale !== undefined && line.scale !== LEFT_SCALE,
  )?.scale;
  return {
    width,
    height: CHART_HEIGHT,
    scales: {
      x: { time: true },
      ...(rightScale !== undefined ? { [rightScale]: {} } : {}),
    },
    series: [
      { label: 'Month', value: monthLegendValue(marks) },
      ...lines.map((line, index) => ({
        label: line.label,
        stroke: line.color,
        ...(line.scale !== undefined ? { scale: line.scale } : {}),
        ...(paired ? { points: { show: false } } : {}),
        ...(line.dash !== undefined
          ? { dash: line.dash.map((segment) => segment * canvasScale()) }
          : {}),
        value: legendValue(lines, index),
      })),
    ],
    axes: yAxes(lines, rightScale),
    ...(paired || marked ? { hooks: plotHooks(lines, marks) } : {}),
  };
}

function yAxes(lines: readonly PlotLine[], rightScale: string | undefined) {
  const axes = [
    {},
    {
      scale: LEFT_SCALE,
      size: yAxisSize(axisLabels(lines, LEFT_SCALE)),
      values: (_u: uPlot, splits: number[]) => splits.map(formatAxisNumber),
      ...(rightScale !== undefined ? { label: scaleUnit(lines, LEFT_SCALE) } : {}),
    },
  ];
  if (rightScale === undefined) {
    return axes;
  }
  return [
    ...axes,
    {
      scale: rightScale,
      side: AXIS_RIGHT,
      size: yAxisSize(axisLabels(lines, rightScale)),
      values: (_u: uPlot, splits: number[]) => splits.map(formatAxisNumber),
      label: scaleUnit(lines, rightScale),
      grid: { show: false },
    },
  ];
}

function axisLabels(lines: readonly PlotLine[], scale: string): string[] {
  return yAxisSplits(samplesOn(lines, scale)).map(formatAxisNumber);
}

function samplesOn(lines: readonly PlotLine[], scale: string): number[] {
  return lines
    .filter((line) => (line.scale ?? LEFT_SCALE) === scale)
    .flatMap((line) => line.values ?? []);
}

function scaleUnit(lines: readonly PlotLine[], scale: string): string {
  return lines.find((line) => (line.scale ?? LEFT_SCALE) === scale)?.unit ?? '';
}

/** uPlot series indexes left out of the legend. Series 0 is the month axis. */
export function hiddenLegendSeries(lines: readonly { omitLegend?: boolean }[]): number[] {
  const hidden: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.omitLegend === true) {
      hidden.push(index + 1);
    }
  }
  return hidden;
}

/** uPlot series indexes that stay bright when `seriesIdx` is hovered. */
export function focusedSeries(lines: readonly { pair?: string }[], seriesIdx: number): number[] {
  const id = lines[seriesIdx - 1]?.pair;
  if (id === undefined) {
    return [seriesIdx];
  }
  const group: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.pair === id) {
      group.push(index + 1);
    }
  }
  return group;
}

function plotHooks(lines: readonly PlotLine[], marks: ChartMarks): uPlot.Hooks.Arrays {
  const paired = lines.some((line) => line.pair !== undefined);
  const marked = hasMarks(marks);
  const hooks: uPlot.Hooks.Arrays = {};
  if (paired || marked) {
    hooks.ready = [
      (plot) => {
        if (paired) {
          bindLegend(plot, lines);
        }
        if (marked) {
          bindEventLegend(plot, marks);
        }
      },
    ];
  }
  if (marked) {
    hooks.drawClear = [
      (plot) => {
        paintMarks(plot, marks);
      },
    ];
    hooks.setCursor = [
      (plot) => {
        refreshEventLegend(plot, marks);
      },
    ];
  }
  if (paired) {
    hooks.draw = [
      (plot) => {
        paintDashedLines(plot, lines);
      },
    ];
    hooks.setSeries = [
      (plot, seriesIdx, opts) => {
        if (seriesIdx == null || !isFocus(opts)) {
          return;
        }
        const group = focusedSeries(lines, seriesIdx);
        if (group.length < 2) {
          return;
        }
        brighten(plot, group);
      },
    ];
  }
  return hooks;
}

function isFocus(opts: object): boolean {
  return 'focus' in opts && opts.focus === true;
}

/** Legend hover is separate from cursor proximity, so a pair can highlight together. */
function bindLegend(plot: uPlot, lines: readonly PlotLine[]): void {
  const rows = legendRows(plot);
  for (const index of hiddenLegendSeries(lines)) {
    const row = rows[index];
    if (row !== undefined) {
      row.style.display = 'none';
    }
  }
  rows.forEach((row, index) => {
    if (index === 0) {
      return;
    }
    row.addEventListener('mouseenter', () => {
      plot.setSeries(index, { focus: true });
    });
  });
  plot.root.querySelector('.u-legend')?.addEventListener('mouseleave', () => {
    plot.setSeries(null, { focus: true });
  });
}

function bindEventLegend(plot: uPlot, marks: ChartMarks): void {
  const legend = plot.root.querySelector('.u-legend');
  if (legend === null) {
    return;
  }
  let host = legend.querySelector<HTMLElement>('.u-event-legend');
  if (host === null) {
    host = document.createElement('div');
    host.className = 'u-event-legend';
    legend.appendChild(host);
  }
  refreshEventLegend(plot, marks);
}

function refreshEventLegend(plot: uPlot, marks: ChartMarks): void {
  const host = plot.root.querySelector<HTMLElement>('.u-event-legend');
  if (host === null) {
    return;
  }
  const idx = plot.cursor.idx;
  host.replaceChildren();
  if (idx === null || idx === undefined) {
    return;
  }
  for (const event of eventsAt(marks, idx)) {
    host.appendChild(eventRow(event));
  }
}

function eventRow(event: ChartEvent): HTMLElement {
  const row = document.createElement('div');
  row.className = 'u-event-row';
  const swatch = document.createElement('span');
  swatch.className = 'u-event-swatch';
  paintSwatch(swatch, event.color, event.style);
  const label = document.createElement('span');
  label.className = 'u-event-label';
  label.textContent = event.label;
  row.append(swatch, label);
  return row;
}

function paintSwatch(swatch: HTMLElement, color: string, style: MarkStyle): void {
  swatch.style.borderColor = color;
  if (style === 'variant') {
    swatch.style.backgroundImage = `repeating-linear-gradient(-45deg, ${rgba(color, 0.55)}, ${rgba(color, 0.55)} 1px, transparent 1px, transparent 4px)`;
    swatch.style.backgroundColor = rgba(color, HATCH_FILL_ALPHA);
  } else {
    swatch.style.backgroundColor = rgba(color, 0.35);
  }
}

function brighten(plot: uPlot, indices: readonly number[]): void {
  const rows = legendRows(plot);
  const points = [...plot.over.querySelectorAll<HTMLElement>('.u-cursor-pt')];
  for (const index of indices) {
    const series = plot.series[index] as FocusedSeries | undefined;
    if (series === undefined) {
      continue;
    }
    series._focus = true;
    series.alpha = 1;
    const row = rows[index];
    if (row !== undefined) {
      row.style.opacity = '1';
    }
    const point = points[index - 1];
    if (point !== undefined) {
      point.style.opacity = '1';
    }
  }
}

function legendRows(plot: uPlot): HTMLElement[] {
  return [...plot.root.querySelectorAll<HTMLElement>('.u-legend .u-series')];
}

function canvasScale(): number {
  const ratio = globalThis.devicePixelRatio;
  return typeof ratio === 'number' && ratio > 0 ? ratio : 1;
}

function isStrokePath(path: unknown): path is Path2D {
  return typeof Path2D === 'function' && path instanceof Path2D;
}

/** Restroke each scenario line so its gaps show the chart surface instead of the solid baseline. */
function paintDashedLines(plot: uPlot, lines: readonly PlotLine[]): void {
  const scale = canvasScale();
  const ctx = plot.ctx;
  const { left, top, width, height } = plot.bbox;
  if (width <= 0 || height <= 0) {
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  for (let index = 0; index < lines.length; index += 1) {
    const series = plot.series[index + 1] as FocusedSeries | undefined;
    const dash = series?.dash;
    const path = series?._paths?.stroke;
    if (
      series === undefined ||
      series.show === false ||
      dash === undefined ||
      dash.length === 0 ||
      !isStrokePath(path)
    ) {
      continue;
    }
    const colorWidth = (series.width ?? 1) * scale;
    ctx.globalAlpha = series.alpha ?? 1;
    ctx.setLineDash(dash);
    ctx.lineWidth = colorWidth + 2 * scale;
    ctx.strokeStyle = CHART_SURFACE;
    ctx.stroke(path);
    ctx.lineWidth = colorWidth;
    ctx.strokeStyle = lines[index]?.color ?? '#000';
    ctx.stroke(path);
  }
  ctx.restore();
}

function paintMarks(plot: uPlot, marks: ChartMarks): void {
  const { left, top, width, height } = plot.bbox;
  if (width <= 0 || height <= 0) {
    return;
  }
  const xs = plot.data[0];
  if (!Array.isArray(xs) || xs.length === 0) {
    return;
  }
  const bottom = top + height;
  const ctx = plot.ctx;
  const scale = canvasScale();
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  for (const band of marks.bands) {
    const span = monthSpan(plot, xs, band.start, band.end, scale);
    fillBand(ctx, span.left, top, span.right, bottom, band.color, band.style === 'variant', scale);
  }
  for (const rule of marks.rules) {
    const x = plot.valToPos(Number(xs[rule.tick]), 'x', true);
    strokeRule(ctx, x, top, bottom, rule.color, rule.style === 'variant', scale);
  }
  ctx.restore();
}

function monthSpan(
  plot: uPlot,
  xs: unknown[],
  start: number,
  end: number,
  scale: number,
): { left: number; right: number } {
  const first = Number(xs[0]);
  const second = xs.length > 1 ? Number(xs[1]) : first;
  const half =
    xs.length > 1
      ? Math.abs(plot.valToPos(second, 'x', true) - plot.valToPos(first, 'x', true)) / 2
      : 4 * scale;
  return {
    left: plot.valToPos(Number(xs[start]), 'x', true) - half,
    right: plot.valToPos(Number(xs[end]), 'x', true) + half,
  };
}

function fillBand(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  right: number,
  bottom: number,
  color: string,
  hatched: boolean,
  scale: number,
): void {
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) {
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  if (hatched) {
    ctx.fillStyle = rgba(color, HATCH_FILL_ALPHA);
    ctx.fillRect(left, top, width, height);
    ctx.strokeStyle = rgba(color, HATCH_LINE_ALPHA);
    ctx.lineWidth = Math.max(1, scale);
    ctx.setLineDash([]);
    const step = 6 * scale;
    for (let x = left - height; x < right + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, bottom);
      ctx.lineTo(x + height, top);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = rgba(color, BAND_ALPHA);
    ctx.fillRect(left, top, width, height);
  }
  ctx.restore();
}

function strokeRule(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
  color: string,
  dashed: boolean,
  scale: number,
): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, RULE_ALPHA);
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash(dashed ? [4 * scale, 3 * scale] : []);
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.restore();
}

function rgba(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (match === null) {
    return hex;
  }
  const raw = match[1] ?? '';
  const full = raw.length === 3 ? [...raw].map((ch) => `${ch}${ch}`).join('') : raw;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function monthLegendValue(
  marks: ChartMarks,
): (self: uPlot, raw: number, seriesIdx: number, idx: number | null) => string {
  return (_self, raw, _seriesIdx, idx) => {
    if (idx === null || !Number.isFinite(raw)) {
      return '--';
    }
    const month = formatLegendMonth(raw);
    const events = eventsAt(marks, idx);
    if (events.length === 0) {
      return month;
    }
    return `${month} · ${events.map((event) => event.label).join(', ')}`;
  };
}

/** Short month and year for the live legend, matching uPlot's MMM YYYY style. */
export function formatLegendMonth(seconds: number): string {
  const date = new Date(seconds * 1000);
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function legendValue(
  lines: readonly PlotLine[],
  index: number,
): (self: uPlot, value: number | null, seriesIdx: number, idx: number | null) => string {
  return (self, value, _seriesIdx, idx) => {
    if (idx === null) {
      return '--';
    }
    const current = pointText(value);
    const id = lines[index]?.pair;
    if (id === undefined || lines[index]?.omitLegend === true) {
      return current;
    }
    const baseline = lines.findIndex((line) => line.pair === id && line.omitLegend === true);
    if (baseline === -1) {
      return current;
    }
    const from = pointText(self.data[baseline + 1]?.[idx]);
    const baselineUnit = lines[baseline]?.unit;
    const variantUnit = lines[index]?.unit;
    if (baselineUnit !== undefined && variantUnit !== undefined && baselineUnit !== variantUnit) {
      return `${from} ${baselineUnit} → ${current} ${variantUnit}`;
    }
    return `${from} → ${current}`;
  };
}

function pointText(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }
  return formatAxisNumber(value);
}

export function plotData(
  ticks: readonly number[],
  lines: readonly { values: readonly number[] }[],
  origin: Date,
): uPlot.AlignedData {
  const data: uPlot.AlignedData = [monthAxisSeconds(ticks, origin)];
  for (const line of lines) {
    data.push([...line.values]);
  }
  return data;
}

/** Compact tick labels so large cent and satoshi stocks stay readable. */
export function formatAxisNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  if (Object.is(value, -0) || value === 0) {
    return '0';
  }
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${sign}${trimFixed(absolute / 1_000_000_000)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${sign}${trimFixed(absolute / 1_000_000)}M`;
  }
  if (absolute >= 10_000) {
    return `${sign}${trimFixed(absolute / 1_000)}k`;
  }
  if (absolute >= 1_000) {
    return `${sign}${trimFixed(absolute / 1_000)}k`;
  }
  if (Number.isInteger(absolute)) {
    return `${sign}${absolute}`;
  }
  return `${sign}${absolute.toPrecision(3)}`;
}

function trimFixed(value: number): string {
  if (value >= 100) {
    return String(Math.round(value));
  }
  if (value >= 10) {
    return value.toFixed(1).replace(/\.0$/, '');
  }
  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function yAxisSize(labels: readonly string[]): number {
  let longest = 1;
  for (const label of labels) {
    longest = Math.max(longest, label.length);
  }
  return Math.max(Y_AXIS_MIN, longest * Y_AXIS_CHAR + 12);
}

/** Representative splits used only to size the axis before uPlot draws. */
function yAxisSplits(values: readonly number[]): number[] {
  let max = 0;
  for (const value of values) {
    if (Number.isFinite(value)) {
      max = Math.max(max, Math.abs(value));
    }
  }
  if (max === 0) {
    return [0];
  }
  return [0, max / 4, max / 2, (3 * max) / 4, max];
}
