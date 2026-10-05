import { describe, expect, it } from 'vitest';
import { runCount, tickBudget } from './budget.js';

const run = { kind: 'run' as const, seed: 1, ticks: 4, sliders: {} };

describe('tickBudget', () => {
  it('counts one run, two for a comparison, and one per band seed', () => {
    expect(tickBudget(run)).toBe(4);
    expect(tickBudget({ ...run, kind: 'compare' })).toBe(8);
    expect(tickBudget({ ...run, kind: 'band', seeds: [1, 2, 3] })).toBe(12);
    expect(runCount({ ...run, kind: 'band', seeds: [1, 2, 3] })).toBe(3);
  });

  it('rejects an empty band and a non-positive tick count', () => {
    expect(() => tickBudget({ ...run, kind: 'band', seeds: [] })).toThrow(
      /band needs at least one seed/,
    );
    expect(() => tickBudget({ ...run, ticks: 0 })).toThrow(/positive integer/);
  });
});
