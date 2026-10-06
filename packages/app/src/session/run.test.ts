import { describe, expect, it } from 'vitest';
import { tickBudget } from '../worker/budget.js';
import { activityLabel, bandSeeds, readyLabel, runRequest } from './run.js';

describe('runRequest', () => {
  it('builds a single run and a five-seed band', () => {
    const sliders = { 'regime.type': 'fiat' };
    expect(runRequest('run', 2, 12, sliders)).toEqual({ kind: 'run', seed: 2, ticks: 12, sliders });
    const band = runRequest('band', 2, 12, sliders);
    expect(band).toEqual({ kind: 'band', seed: 2, ticks: 12, sliders, seeds: [2, 3, 4, 5, 6] });
    expect(tickBudget(band)).toBe(60);
  });

  it('rejects a bad seed, a bad tick count, and a band that would overflow', () => {
    expect(() => runRequest('run', -1, 12, {})).toThrow(/Seed/);
    expect(() => runRequest('run', 1, 0, {})).toThrow(/Ticks/);
    expect(() => bandSeeds(Number.MAX_SAFE_INTEGER)).toThrow(/safe integer range/);
  });
});

describe('run labels', () => {
  it('names the activity and the finished state', () => {
    expect(activityLabel('run')).toBe('Running…');
    expect(activityLabel('band')).toBe('Running five seeds…');
    expect(readyLabel('run')).toBe('Run ready.');
    expect(readyLabel('band')).toBe('Band ready.');
  });
});
