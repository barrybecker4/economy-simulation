import type uPlot from 'uplot';
import { monthAxisSeconds } from './time.js';

const CHART_HEIGHT = 240;

export function plotOptions(width: number, lines: readonly { label: string; color: string }[]) {
  return {
    width,
    height: CHART_HEIGHT,
    scales: { x: { time: true } },
    series: [
      { label: 'Month', value: '{MMM} {YYYY}' },
      ...lines.map((line) => ({ label: line.label, stroke: line.color })),
    ],
    axes: [{}, { size: 48 }],
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
