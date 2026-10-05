import { describe, expect, it } from 'vitest';
import { plotData, plotOptions } from './options.js';

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
