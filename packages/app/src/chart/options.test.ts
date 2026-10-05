import { describe, expect, it } from 'vitest';
import { formatAxisNumber, plotData, plotOptions } from './options.js';

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
      { label: 'CPI baseline', color: '#1e3a8a' },
      { label: 'CPI', color: '#1e3a8a', dash: [6, 4] },
    ]);
    expect(options.series[1]?.dash).toBeUndefined();
    expect(options.series[2]?.dash).toEqual([6, 4]);
    expect(options.series[1]?.stroke).toBe('#1e3a8a');
    expect(options.series[2]?.stroke).toBe('#1e3a8a');
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
