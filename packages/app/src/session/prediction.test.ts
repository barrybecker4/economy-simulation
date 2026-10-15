import { describe, expect, it } from 'vitest';
import type { RunSuccess } from '../worker/protocol.js';
import { requireLesson } from './lessons.js';
import { predictionOutcome } from './prediction.js';

function runWith(series: Record<string, number[]>): RunSuccess {
  const length = Object.values(series)[0]?.length ?? 0;
  return {
    kind: 'run',
    ticks: Array.from({ length }, (_, i) => i),
    series,
  };
}

describe('predictionOutcome', () => {
  it('scores the prices guess from category paths', () => {
    const result = runWith({
      priceApparel: [100, 80],
      priceElectronics: [100, 50],
      priceHousing: [100, 140],
      priceMedical: [100, 90],
    });
    const hit = predictionOutcome(requireLesson('prices'), 'apparel-electronics', null, result);
    expect(hit.matched).toBe(true);
    expect(hit.message).toMatch(/matched/);
    const miss = predictionOutcome(requireLesson('prices'), 'all-rise', null, result);
    expect(miss.matched).toBe(false);
    expect(miss.message).toMatch(/did not match/);
  });

  it('scores a grant guess against the baseline', () => {
    const baseline = runWith({ ubiOutlay: [0, 0], unemployment: [0.5, 1] });
    const variant = runWith({ ubiOutlay: [0, 100], unemployment: [0.5, 1] });
    const hit = predictionOutcome(requireLesson('gains'), 'grant-rises', baseline, variant);
    expect(hit.matched).toBe(true);
    expect(hit.message).toMatch(/matched/);
  });

  it('scores a grant fall against a chained comparison baseline', () => {
    const high = runWith({ ubiOutlay: [0, 200] });
    const substantial = runWith({ ubiOutlay: [0, 100] });
    const hit = predictionOutcome(requireLesson('gains'), 'grant-falls', high, substantial);
    expect(hit.matched).toBe(true);
    expect(hit.message).toMatch(/matched/);
    expect(hit.message).toMatch(/grant fell/);
  });
});
