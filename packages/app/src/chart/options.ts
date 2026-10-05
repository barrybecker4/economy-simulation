import type uPlot from 'uplot';
import { monthAxisSeconds } from './time.js';

const CHART_HEIGHT = 240;
const Y_AXIS_MIN = 52;
const Y_AXIS_CHAR = 7;

export interface PlotLine {
  label: string;
  color: string;
  values?: readonly number[];
  dash?: readonly number[];
  omitLegend?: boolean;
  pair?: string;
}

interface FocusedSeries extends uPlot.Series {
  _focus?: boolean | null;
  _paths?: { stroke?: Path2D | null } | null;
}

/** Chart surface color. The variant dash is outlined in this so it reads against a same-color solid line. */
const CHART_SURFACE = '#fff';

export function plotOptions(width: number, lines: readonly PlotLine[]) {
  const samples = lines.flatMap((line) => line.values ?? []);
  const axisLabels = yAxisSplits(samples).map(formatAxisNumber);
  const paired = lines.some((line) => line.pair !== undefined);
  return {
    width,
    height: CHART_HEIGHT,
    scales: { x: { time: true } },
    series: [
      { label: 'Month', value: '{MMM} {YYYY}' },
      ...lines.map((line, index) => ({
        label: line.label,
        stroke: line.color,
        ...(paired ? { points: { show: false } } : {}),
        ...(line.dash !== undefined ? { dash: line.dash.map((segment) => segment * canvasScale()) } : {}),
        value: legendValue(lines, index),
      })),
    ],
    axes: [
      {},
      {
        size: yAxisSize(axisLabels),
        values: (_u: uPlot, splits: number[]) => splits.map(formatAxisNumber),
      },
    ],
    ...(paired ? { hooks: pairHooks(lines) } : {}),
  };
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

function pairHooks(lines: readonly PlotLine[]): uPlot.Hooks.Arrays {
  return {
    ready: [
      (plot) => {
        bindLegend(plot, lines);
      },
    ],
    draw: [
      (plot) => {
        paintDashedLines(plot, lines);
      },
    ],
    setSeries: [
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
    ],
  };
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

/** Restroke each variant so its gaps show the chart surface instead of the solid baseline. */
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
    return `${pointText(self.data[baseline + 1]?.[idx])} → ${current}`;
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
  lines: readonly { values: number[] }[],
  origin: Date,
): uPlot.AlignedData {
  const data: uPlot.AlignedData = [monthAxisSeconds(ticks, origin)];
  for (const line of lines) {
    data.push(line.values);
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
