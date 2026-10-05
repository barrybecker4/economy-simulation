import type uPlot from 'uplot';
import { describe, expect, it } from 'vitest';

if (typeof globalThis.Path2D !== 'function') {
  globalThis.Path2D = function Path2D(this: { kind: string }) {
    this.kind = 'path';
  } as unknown as typeof Path2D;
}
import {
  focusedSeries,
  formatAxisNumber,
  hiddenLegendSeries,
  plotData,
  plotOptions,
} from './options.js';

describe('plotOptions', () => {
  it('puts the month axis before each line, in the same order as the data', () => {
    const options = plotOptions(640, [
      { label: 'CPI', color: '#246' },
      { label: 'Food', color: '#9a3412' },
    ]);
    expect(options.width).toBe(640);
    expect(options.series.map((series) => series.label)).toEqual(['Month', 'CPI', 'Food']);
    expect(options.series[1]?.stroke).toBe('#246');
  });

  it('dashes a variant line and leaves the baseline solid', () => {
    const options = plotOptions(640, [
      { label: 'CPI', color: '#1e3a8a', omitLegend: true, pair: 'priceLevel' },
      { label: 'CPI', color: '#1e3a8a', dash: [6, 4], pair: 'priceLevel' },
    ]);
    expect(options.series[1]?.dash).toBeUndefined();
    expect(options.series[2]?.dash).toEqual([6, 4]);
    expect(options.series[1]?.points?.show).toBe(false);
    expect(options.series[1]?.stroke).toBe('#1e3a8a');
    expect(options.series[2]?.stroke).toBe('#1e3a8a');
  });

  it('outlines a dashed variant so the solid baseline still shows through the gaps', () => {
    const lines = [
      { label: 'CPI', color: '#1e3a8a', omitLegend: true, pair: 'priceLevel' },
      { label: 'CPI', color: '#246', dash: [6, 4], pair: 'priceLevel' },
    ];
    const options = plotOptions(640, lines);
    const path = new Path2D();
    const strokes: { width: number; style: string; dash: string }[] = [];
    let dash = '';
    const ctx = {
      save() {},
      restore() {},
      beginPath() {},
      rect() {},
      clip() {},
      setLineDash(segments: number[]) {
        dash = segments.join(',');
      },
      stroke() {
        strokes.push({ width: ctx.lineWidth, style: String(ctx.strokeStyle), dash });
      },
      lineWidth: 0,
      strokeStyle: '',
      lineJoin: '',
      lineCap: '',
      globalAlpha: 1,
    };
    const plot = {
      ctx,
      bbox: { left: 1, top: 2, width: 100, height: 40 },
      series: [
        {},
        { show: true, alpha: 1, width: 1 },
        { show: true, alpha: 0.3, width: 1, dash: [6, 4], _paths: { stroke: path } },
      ],
    } as unknown as uPlot;
    options.hooks?.draw?.[0]?.(plot);
    expect(strokes).toEqual([
      { width: 3, style: '#fff', dash: '6,4' },
      { width: 1, style: '#246', dash: '6,4' },
    ]);
    expect(ctx.globalAlpha).toBe(0.3);
  });

  it('shows one legend value for a pair, baseline then variant', () => {
    const lines = [
      { label: 'CPI', color: '#1e3a8a', omitLegend: true, pair: 'priceLevel' },
      { label: 'CPI', color: '#1e3a8a', dash: [6, 4], pair: 'priceLevel' },
      { label: 'Food', color: '#9a3412' },
    ];
    const options = plotOptions(640, lines);
    expect(hiddenLegendSeries(lines)).toEqual([1]);
    expect(focusedSeries(lines, 1)).toEqual([1, 2]);
    expect(focusedSeries(lines, 2)).toEqual([1, 2]);
    expect(focusedSeries(lines, 3)).toEqual([3]);
    const paired = options.series[2]?.value;
    const single = options.series[3]?.value;
    expect(typeof paired).toBe('function');
    expect(typeof single).toBe('function');
    if (typeof paired !== 'function' || typeof single !== 'function') {
      return;
    }
    const plot = {
      data: [
        [0, 1],
        [10, 250_000],
        [30, 40],
        [2, 3],
      ],
    } as uPlot;
    expect(paired(plot, 30, 2, 0)).toBe('10 → 30');
    expect(paired(plot, 40, 2, 1)).toBe('250k → 40');
    expect(paired(plot, null, 2, null)).toBe('--');
    expect(single(plot, 2, 3, 0)).toBe('2');
  });

  it('hides the baseline legend row and highlights both lines on hover', () => {
    const lines = [
      { label: 'CPI', color: '#1e3a8a', omitLegend: true, pair: 'priceLevel' },
      { label: 'CPI', color: '#1e3a8a', dash: [6, 4], pair: 'priceLevel' },
      { label: 'Food', color: '#9a3412', omitLegend: true, pair: 'priceFood' },
      { label: 'Food', color: '#9a3412', dash: [6, 4], pair: 'priceFood' },
    ];
    const options = plotOptions(640, lines);
    const rows = ['Month', 'CPI', 'CPI', 'Food', 'Food'].map(() => ({
      style: { display: '', opacity: '' },
      listeners: new Map<string, EventListener>(),
      addEventListener(type: string, listener: EventListener) {
        this.listeners.set(type, listener);
      },
    }));
    const table = {
      listeners: new Map<string, EventListener>(),
      addEventListener(type: string, listener: EventListener) {
        this.listeners.set(type, listener);
      },
    };
    const points = rows.slice(1).map(() => ({ style: { opacity: '0.3' } }));
    const series = rows.map(() => ({ alpha: 0.3, _focus: false as boolean | null }));
    const focused: { index: number | null; opts: { focus?: boolean } | null } = {
      index: null,
      opts: null,
    };
    const plot = {
      series,
      root: {
        querySelectorAll: () => rows,
        querySelector: () => table,
      },
      over: {
        querySelectorAll: () => points,
      },
      setSeries(index: number | null, opts: { focus?: boolean }) {
        focused.index = index;
        focused.opts = opts;
      },
    } as unknown as uPlot;

    options.hooks?.ready?.[0]?.(plot);
    expect(rows[1]?.style.display).toBe('none');
    expect(rows[2]?.style.display).toBe('');
    expect(rows[3]?.style.display).toBe('none');
    expect(rows[4]?.style.display).toBe('');

    rows[2]?.listeners.get('mouseenter')?.(new Event('mouseenter'));
    expect(focused).toEqual({ index: 2, opts: { focus: true } });
    table.listeners.get('mouseleave')?.(new Event('mouseleave'));
    expect(focused.index).toBeNull();

    series[1] = { alpha: 0.3, _focus: false };
    series[2] = { alpha: 1, _focus: true };
    series[4] = { alpha: 0.3, _focus: false };
    const baselineRow = rows[1];
    const otherRow = rows[4];
    if (baselineRow === undefined || otherRow === undefined) {
      throw new Error('missing legend rows');
    }
    baselineRow.style.opacity = '0.3';
    otherRow.style.opacity = '0.3';
    options.hooks?.setSeries?.[0]?.(plot, 2, { focus: true } as uPlot.Series);
    expect(series[1]).toMatchObject({ alpha: 1, _focus: true });
    expect(series[2]).toMatchObject({ alpha: 1, _focus: true });
    expect(series[4]).toMatchObject({ alpha: 0.3, _focus: false });
    expect(rows[1]?.style.opacity).toBe('1');
    expect(rows[4]?.style.opacity).toBe('0.3');
    expect(points[0]?.style.opacity).toBe('1');
    expect(points[1]?.style.opacity).toBe('1');
    expect(points[3]?.style.opacity).toBe('0.3');
  });

  it('widens the y-axis for large money flows and formats ticks compactly', () => {
    const options = plotOptions(640, [
      { label: 'Wages', color: '#a16207', values: [0, 250_000, 1_200_000] },
    ]);
    const yAxis = options.axes[1];
    expect(yAxis?.size).toBeGreaterThan(48);
    expect(yAxis?.values?.(null as never, [0, 250_000, 1_200_000])).toEqual(['0', '250k', '1.2M']);
  });
});

describe('formatAxisNumber', () => {
  it('keeps small values plain and compresses large ones', () => {
    expect(formatAxisNumber(0)).toBe('0');
    expect(formatAxisNumber(42)).toBe('42');
    expect(formatAxisNumber(12_500)).toBe('12.5k');
    expect(formatAxisNumber(1_000_000)).toBe('1M');
    expect(formatAxisNumber(-2_500_000)).toBe('-2.5M');
  });
});

describe('plotData', () => {
  it('pairs month seconds with each line', () => {
    const origin = new Date(2026, 0, 15);
    const data = plotData([0, 1], [{ values: [4, 5] }], origin);
    expect(data).toHaveLength(2);
    expect(data[0]).toEqual([
      new Date(2026, 0, 1).getTime() / 1000,
      new Date(2026, 1, 1).getTime() / 1000,
    ]);
    expect(data[1]).toEqual([4, 5]);
  });
});
