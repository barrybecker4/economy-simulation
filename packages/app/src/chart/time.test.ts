import { describe, expect, it } from 'vitest';
import { monthAxisLabel, monthAxisSeconds } from './time.js';

describe('month axis', () => {
  const origin = new Date(2026, 9, 4);

  it('places tick 0 on the first of the origin month', () => {
    const [first] = monthAxisSeconds([0], origin);
    expect(first).toBe(new Date(2026, 9, 1).getTime() / 1000);
  });

  it('steps one calendar month per tick, across year boundaries', () => {
    const seconds = monthAxisSeconds([0, 1, 12, 15], origin);
    const dates = seconds.map((second) => new Date(second * 1000));
    expect(dates.map((date) => date.getMonth())).toEqual([9, 10, 9, 0]);
    expect(dates.map((date) => date.getFullYear())).toEqual([2026, 2026, 2027, 2028]);
    expect(dates.map((date) => date.getDate())).toEqual([1, 1, 1, 1]);
  });

  it('labels the first tick', () => {
    expect(monthAxisLabel([0, 1, 2], origin)).toBe('October 2026');
    expect(monthAxisLabel([3], new Date(2026, 10, 15))).toBe('February 2027');
  });

  it('rejects an empty axis', () => {
    expect(() => monthAxisLabel([], origin)).toThrow(/no ticks/);
  });
});
