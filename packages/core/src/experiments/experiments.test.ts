import { describe, expect, it } from 'vitest';
import { morrisScreen } from './morris.js';
import { runHypotheses } from './hypotheses.js';
import { pairedDifference, summarize } from './summary.js';
import { runSweep } from './sweep.js';

describe('experiments', () => {
  it('summarizes a sweep and repeats it exactly', () => {
    const jobs = [1, 2].flatMap((seed) =>
      ['fiat', 'bitcoin'].map((regime) => ({
        seed,
        ticks: 12,
        regime,
        preset: 'neutral',
        sliders: {
          'scale.households': 30,
          'scale.firms': 4,
          'scale.banks': 1,
          'shock.frequency': 0,
        },
      })),
    );
    const first = runSweep(jobs);
    const second = runSweep(jobs);
    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(first[0]?.commit.length).toBeGreaterThan(0);
    const fiat = first.filter((row) => row.regime === 'fiat').map((row) => row.metrics.priceLevel);
    const bitcoin = first
      .filter((row) => row.regime === 'bitcoin')
      .map((row) => row.metrics.priceLevel);
    const summary = summarize(fiat);
    expect(summary.p05).toBeLessThanOrEqual(summary.median);
    expect(summary.median).toBeLessThanOrEqual(summary.p95);
    expect(pairedDifference(fiat, bitcoin).mean).toBeLessThan(0);
  });

  it('ranks Morris effects', () => {
    const effects = morrisScreen(['ai.physicalTaskShare', 'goods.electronicsProductivity'], 1, 12);
    expect(effects.map((effect) => effect.id)).toContain('ai.physicalTaskShare');
    expect(effects.every((effect) => Number.isFinite(effect.effect))).toBe(true);
  });

  it('rejects an enum slider for Morris screening', () => {
    expect(() => morrisScreen(['regime.type'], 1, 12)).toThrow(/number slider/);
  });

  it('rejects paired series of unequal length', () => {
    expect(() => pairedDifference([1, 2], [1])).toThrow(/equal length/);
  });

  it('writes all nine hypotheses', () => {
    const results = runHypotheses();
    expect(results.map((result) => result.id)).toEqual([
      'H1',
      'H2',
      'H3',
      'H4',
      'H5',
      'H6',
      'H7',
      'H8',
      'H9',
    ]);
    expect(results.every((result) => result.detail.length > 0)).toBe(true);
    for (const result of results) {
      expect(result.supported, result.id).toBe(true);
    }
  });
});
