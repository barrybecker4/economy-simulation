import { describe, expect, it } from 'vitest';
import {
  compositeEnabled,
  compositeIndex,
  compositeNote,
  compositeWeights,
  levelsFrom,
  NATURAL_RATE_ANCHOR,
  stabilityScore,
} from './composite.js';

describe('stabilityScore', () => {
  it('scores a 6 percent natural rate as one minus unemployment', () => {
    expect(stabilityScore(0.06, NATURAL_RATE_ANCHOR)).toBeCloseTo(0.94);
    expect(stabilityScore(0, NATURAL_RATE_ANCHOR)).toBe(1);
    expect(stabilityScore(1, NATURAL_RATE_ANCHOR)).toBe(0);
  });

  it('clamps a slack or a tight labor market', () => {
    expect(stabilityScore(0, 0.2)).toBe(1);
    expect(stabilityScore(0.9, 0)).toBeCloseTo(0.04);
  });
});

describe('compositeIndex', () => {
  const levels = {
    giniWealth: 0.4,
    medianRealWealth: 10,
    meanWellbeing: 2,
    unemployment: 0.06,
    naturalUnemployment: 0.06,
  };

  it('weights the last-tick terms', () => {
    const weights = { inequality: 1, medianWealth: 0.5, wellbeing: 2, stability: 1 };
    const expected = 1 * (1 - 0.4) + 0.5 * 10 + 2 * 2 + 1 * stabilityScore(0.06, 0.06);
    expect(compositeIndex(weights, levels)).toBeCloseTo(expected);
  });

  it('stays off while every weight is zero', () => {
    const weights = { inequality: 0, medianWealth: 0, wellbeing: 0, stability: 0 };
    expect(compositeEnabled(weights)).toBe(false);
    expect(compositeEnabled({ ...weights, wellbeing: 0.1 })).toBe(true);
  });

  it('explains why the index is hidden', () => {
    expect(compositeNote(false, null)).toMatch(/Move a welfare weight/);
    expect(compositeNote(true, null)).toMatch(/after a single run/);
    expect(compositeNote(true, 1.2)).toBe('Composite index: 1.200. The weights are assumptions.');
  });
});

describe('compositeWeights', () => {
  it('reads overrides and otherwise the slider default', () => {
    const weights = compositeWeights('fiat', { 'welfare.weightWellbeing': 0.25 });
    expect(weights.wellbeing).toBe(0.25);
    expect(weights.inequality).toBe(0);
  });
});

describe('levelsFrom', () => {
  it('uses the last finite sample', () => {
    const levels = levelsFrom({
      giniWealth: [0.2, 0.4],
      medianRealWealth: [1, 10],
      meanWellbeing: [1, 2],
      unemployment: [0.1, 0.06],
      naturalUnemployment: [0.05, 0.06],
    });
    expect(levels.giniWealth).toBe(0.4);
    expect(levels.medianRealWealth).toBe(10);
  });

  it('rejects a missing series', () => {
    expect(() => levelsFrom({})).toThrow(/Missing series giniWealth/);
  });
});
