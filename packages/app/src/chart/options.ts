import type uPlot from 'uplot';
import { monthAxisSeconds } from './time.js';

const CHART_HEIGHT = 240;
const Y_AXIS_MIN = 52;
const Y_AXIS_CHAR = 7;

export function plotOptions(
  width: number,
  lines: readonly {
    label: string;
    color: string;
    values?: readonly number[];
    dash?: readonly number[];
  }[],
) {
  const samples = lines.flatMap((line) => line.values ?? []);
  const axisLabels = yAxisSplits(samples).map(formatAxisNumber);
  return {
    width,
    height: CHART_HEIGHT,
    scales: { x: { time: true } },
    series: [
      { label: 'Month', value: '{MMM} {YYYY}' },
      ...lines.map((line) => ({
        label: line.label,
        stroke: line.color,
        ...(line.dash !== undefined ? { dash: [...line.dash] } : {}),
        value: (_u: uPlot, value: number | null) =>
          value === null || !Number.isFinite(value) ? '--' : formatAxisNumber(value),
      })),
    ],
    axes: [
      {},
      {
        size: yAxisSize(axisLabels),
        values: (_u: uPlot, splits: number[]) => splits.map(formatAxisNumber),
      },
    ],
  };
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
