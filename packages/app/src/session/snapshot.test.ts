import { describe, expect, it } from 'vitest';
import type { RunSuccess } from '../worker/protocol.js';
import { requireLesson } from './lessons.js';
import { endingDirection, lessonSnapshot } from './snapshot.js';

function runWith(series: Record<string, number[]>): RunSuccess {
  const length = Object.values(series)[0]?.length ?? 0;
  return {
    kind: 'run',
    ticks: Array.from({ length }, (_, i) => i),
    series,
  };
}

describe('lessonSnapshot', () => {
  it('builds rows at opening, mid, and end', () => {
    const result = runWith({
      priceLevel: [100, 110, 120],
      priceHousing: [100, 130, 160],
      priceMedical: [100, 120, 140],
      priceApparel: [100, 90, 80],
      priceElectronics: [100, 70, 50],
      medianRealIncome: [50, 48, 45],
    });
    const card = lessonSnapshot(result, requireLesson('prices'));
    expect(card.rows[0]?.points.map((point) => point.month)).toEqual([0, 2]);
    expect(card.typicalHousehold).toMatch(/real income/);
    expect(card.typicalHousehold).toMatch(/Housing/);
  });
});

describe('endingDirection', () => {
  it('compares the last points', () => {
    const baseline = runWith({ priceLevel: [100, 100], unemployment: [0.05, 0.05] });
    const variant = runWith({ priceLevel: [100, 150], unemployment: [0.05, 0.05] });
    expect(endingDirection(baseline, variant, 'priceLevel')).toBe('higher');
    expect(endingDirection(baseline, variant, 'unemployment')).toBe('same');
  });
});
