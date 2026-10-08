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

  it('names the hovered event in the Month legend value', () => {
    const marks = {
      bands: [
        {
          kind: 'productivity-expansion' as const,
          label: 'Productivity expansion',
          color: '#0f766e',
          start: 1,
          end: 2,
          style: 'solo' as const,
        },
      ],
      rules: [],
    };
    const options = plotOptions(640, [{ label: 'CPI', color: '#246', values: [1, 2, 3] }], marks);
    const monthValue = options.series[0]?.value;
    expect(typeof monthValue).toBe('function');
    if (typeof monthValue !== 'function') {
      return;
    }
    const april = new Date(2031, 3, 1).getTime() / 1000;
    expect(monthValue({} as uPlot, april, 0, null)).toBe('--');
    expect(monthValue({} as uPlot, april, 0, 0)).toBe('Apr 2031');
    expect(monthValue({} as uPlot, april, 0, 1)).toBe('Apr 2031 · Productivity expansion');
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

  it('names each unit in the legend when a pair uses two money scales', () => {
    const lines = [
      {
        label: 'UBI outlay',
        color: '#047857',
        omitLegend: true,
        pair: 'ubiOutlay',
        scale: 'y',
        unit: 'dollars',
        values: [5, 2_500],
      },
      {
        label: 'UBI outlay',
        color: '#047857',
        dash: [8, 6],
        pair: 'ubiOutlay',
        scale: 'sats',
        unit: 'satoshis',
        values: [8, 9],
      },
    ];
    const options = plotOptions(640, lines);
    expect(options.series[1]?.scale).toBe('y');
    expect(options.series[2]?.scale).toBe('sats');
    expect(options.axes[1]).toMatchObject({ scale: 'y', label: 'dollars' });
    expect(options.axes[2]).toMatchObject({
      scale: 'sats',
      side: 1,
      label: 'satoshis',
      grid: { show: false },
    });
    expect(options.scales).toMatchObject({ sats: {} });
    const paired = options.series[2]?.value;
    expect(typeof paired).toBe('function');
    if (typeof paired !== 'function') {
      return;
    }
    const plot = {
      data: [
        [0, 1],
        [5, 2_500],
        [8, 9],
      ],
    } as uPlot;
    expect(paired(plot, 9, 2, 1)).toBe('2.5k dollars → 9 satoshis');
  });

  it('highlights the hovered legend line when the chart is not a comparison', () => {
    const options = plotOptions(640, [
      { label: 'CPI', color: '#246' },
      { label: 'Food', color: '#9a3412' },
    ]);
    const rows = ['Month', 'CPI', 'Food'].map(() => ({
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
    const focused: { index: number | null; opts: { focus?: boolean } | null } = {
      index: null,
      opts: null,
    };
    const plot = {
      root: {
        querySelectorAll: () => rows,
        querySelector: () => table,
      },
      setSeries(index: number | null, opts: { focus?: boolean }) {
        focused.index = index;
        focused.opts = opts;
      },
    } as unknown as uPlot;

    options.hooks?.ready?.[0]?.(plot);
    rows[1]?.listeners.get('mouseenter')?.(new Event('mouseenter'));
    expect(focused).toEqual({ index: 1, opts: { focus: true } });
    rows[2]?.listeners.get('mouseenter')?.(new Event('mouseenter'));
    expect(focused).toEqual({ index: 2, opts: { focus: true } });
    table.listeners.get('mouseleave')?.(new Event('mouseleave'));
    expect(focused).toEqual({ index: null, opts: { focus: true } });
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

  it('paints solid and hatched bands behind the series', () => {
    const marks = {
      bands: [
        {
          kind: 'demand-expansion' as const,
          label: 'Demand expansion',
          color: '#0f766e',
          start: 0,
          end: 1,
          style: 'baseline' as const,
        },
        {
          kind: 'credit-expansion' as const,
          label: 'Credit expansion',
          color: '#0f766e',
          start: 0,
          end: 0,
          style: 'variant' as const,
        },
      ],
      rules: [
        {
          kind: 'bitcoin-rebase' as const,
          label: 'Bitcoin rebase',
          color: '#64748b',
          tick: 1,
          style: 'variant' as const,
        },
      ],
    };
    const options = plotOptions(640, [{ label: 'CPI', color: '#246', values: [1, 2] }], marks);
    const fills: string[] = [];
    const strokes: { style: string; dash: string }[] = [];
    let dash = '';
    const ctx = {
      save() {},
      restore() {},
      beginPath() {},
      rect() {},
      clip() {},
      fillRect() {
        fills.push(String(ctx.fillStyle));
      },
      moveTo() {},
      lineTo() {},
      setLineDash(segments: number[]) {
        dash = segments.join(',');
      },
      stroke() {
        strokes.push({ style: String(ctx.strokeStyle), dash });
      },
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      lineJoin: '',
      lineCap: '',
      globalAlpha: 1,
    };
    const plot = {
      ctx,
      bbox: { left: 0, top: 0, width: 200, height: 100 },
      data: [[0, 1]],
      valToPos(value: number) {
        return value * 100;
      },
      cursor: { idx: null },
      root: {
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    } as unknown as uPlot;
    options.hooks?.drawClear?.[0]?.(plot);
    expect(fills[0]).toMatch(/rgba\(15, 118, 110/);
    expect(fills[1]).toMatch(/rgba\(15, 118, 110/);
    expect(strokes.some((stroke) => stroke.dash === '4,3')).toBe(true);
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
