import { describe, expect, it } from 'vitest';
import {
  CANTILLON_GINI_TARGET,
  INJECTION_CHANNELS,
  meetsCantillonGiniTarget,
  runCantillonExperiment,
  summarizeCantillonChannels,
  summarizeCantillonResults,
} from './cantillon.js';
import { FEATURE_OFF } from '../sim/feature-off.js';

const tiny = {
  ...FEATURE_OFF,
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('cantillon experiment', () => {
  it('runs every injection channel at the same money-growth path', () => {
    const results = runCantillonExperiment({
      seeds: [1, 2],
      ticks: 12,
      regime: 'fiat',
      preset: 'S0',
      baseSliders: tiny,
    });
    expect(results).toHaveLength(INJECTION_CHANNELS.length * 2);
    expect(new Set(results.map((row) => row.channel))).toEqual(new Set(INJECTION_CHANNELS));
    expect(results.every((row) => Number.isFinite(row.wealthGiniChange))).toBe(true);
    expect(results.every((row) => Number.isFinite(row.topDecileChange))).toBe(true);
    expect(results.every((row) => Number.isFinite(row.firstReceiverGain))).toBe(true);
  });

  it('reports a zero Gini gap versus itself for proRataDeposits', () => {
    const results = runCantillonExperiment({
      seeds: [4],
      ticks: 12,
      regime: 'fiat',
      preset: 'S0',
      baseSliders: tiny,
    });
    const proRata = results.filter((row) => row.channel === 'proRataDeposits');
    expect(proRata).toHaveLength(1);
    expect(proRata[0]?.wealthGiniVsProRata).toBe(0);
  });

  it('leaves bitcoin channels identical because bitcoin ignores the slider', () => {
    const results = runCantillonExperiment({
      seeds: [5],
      ticks: 12,
      regime: 'bitcoin',
      preset: 'S0',
      baseSliders: tiny,
    });
    const first = results[0];
    expect(first).toBeDefined();
    for (const row of results) {
      expect(row.wealthGiniEnd).toBe(first?.wealthGiniEnd);
      expect(row.wealthGiniVsProRata).toBe(0);
    }
  });

  it('summarizes mean and range across seeds', () => {
    const results = runCantillonExperiment({
      seeds: [1, 2, 3],
      ticks: 12,
      regime: 'fiat',
      preset: 'S0',
      baseSliders: tiny,
    });
    const summary = summarizeCantillonResults(results, 'proRataDeposits', 'wealthGiniChange');
    expect(summary.mean).toBeGreaterThanOrEqual(summary.min);
    expect(summary.mean).toBeLessThanOrEqual(summary.max);
    expect(summary.range).toBeCloseTo(summary.max - summary.min, 12);
    expect(summarizeCantillonChannels(results)).toHaveLength(INJECTION_CHANNELS.length);
  });

  it('keeps the issue #16 Gini target at ±0.01', () => {
    expect(CANTILLON_GINI_TARGET).toBe(0.01);
    expect(meetsCantillonGiniTarget(0)).toBe(true);
    expect(meetsCantillonGiniTarget(0.01)).toBe(true);
    expect(meetsCantillonGiniTarget(-0.01)).toBe(true);
    expect(meetsCantillonGiniTarget(0.0100001)).toBe(false);
  });
});
