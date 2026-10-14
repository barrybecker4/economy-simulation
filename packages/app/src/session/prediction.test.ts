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
    expect(predictionOutcome(requireLesson('prices'), 'apparel-electronics', null, result)).toMatch(
      /matched/,
    );
    expect(predictionOutcome(requireLesson('prices'), 'all-rise', null, result)).toMatch(
      /did not match/,
    );
  });

  it('scores a grant guess against the baseline', () => {
    const baseline = runWith({ ubiOutlay: [0, 0], unemployment: [0.5, 1] });
    const variant = runWith({ ubiOutlay: [0, 100], unemployment: [0.5, 1] });
    expect(
      predictionOutcome(requireLesson('gains'), 'grant-rises', baseline, variant),
    ).toMatch(/matched/);
  });
});
