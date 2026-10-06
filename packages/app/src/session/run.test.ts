import { describe, expect, it } from 'vitest';
import { tickBudget } from '../worker/budget.js';
import { activityLabel, bandSeeds, readyLabel, runRequest } from './run.js';

describe('runRequest', () => {
  it('builds a single run and a multi-seed band', () => {
    const sliders = { 'regime.type': 'fiat' };
    expect(runRequest(2, 12, 1, sliders)).toEqual({ kind: 'run', seed: 2, ticks: 12, sliders });
    const band = runRequest(2, 12, 5, sliders);
    expect(band).toEqual({ kind: 'band', seed: 2, ticks: 12, sliders, seeds: [2, 3, 4, 5, 6] });
    expect(tickBudget(band)).toBe(60);
    expect(runRequest(2, 12, 3, sliders)).toEqual({
      kind: 'band',
      seed: 2,
      ticks: 12,
      sliders,
      seeds: [2, 3, 4],
    });
  });

  it('rejects a bad seed, a bad tick count, a bad seed count, and a band that would overflow', () => {
    expect(() => runRequest(-1, 12, 1, {})).toThrow(/Seed/);
    expect(() => runRequest(1, 0, 1, {})).toThrow(/Ticks/);
    expect(() => runRequest(1, 12, 0, {})).toThrow(/Seed count/);
    expect(() => runRequest(1, 12, 21, {})).toThrow(/Seed count/);
    expect(() => bandSeeds(Number.MAX_SAFE_INTEGER, 2)).toThrow(/safe integer range/);
  });
});

describe('run labels', () => {
  it('names the activity and the finished state', () => {
    expect(activityLabel(1)).toBe('Running…');
    expect(activityLabel(5)).toBe('Running 5 seeds…');
    expect(readyLabel()).toBe('Run ready.');
  });
});
