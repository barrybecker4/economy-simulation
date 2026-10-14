import { describe, expect, it } from 'vitest';
import { loadScenario } from '../../../core/src/config/load.js';
import { listSliders } from '../../../core/src/config/registry.js';
import type { MetricId } from '../../../core/src/metrics/metrics.js';
import { simulate } from '../../../core/src/sim/simulate.js';
import { applyLessonLever, LESSON_TICKS, requireLesson } from './lessons.js';
import { resolvedSliders } from './sliders.js';

const sliders = listSliders();

type Direction = 'higher' | 'lower' | 'same';
type SeriesMap = Record<MetricId, Array<number | null>>;

function lastFinite(series: readonly (number | null)[]): number {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const value = series[i];
    if (value !== null && value !== undefined && Number.isFinite(value)) {
      return value;
    }
  }
  throw new Error('Series has no finite points');
}

function firstFinite(series: readonly (number | null)[]): number {
  for (const value of series) {
    if (value !== null && value !== undefined && Number.isFinite(value)) {
      return value;
    }
  }
  throw new Error('Series has no finite points');
}

function direction(from: number, to: number): Direction {
  const gap = Math.abs(to - from);
  if (gap <= Math.max(1e-9, 1e-6 * Math.max(Math.abs(from), Math.abs(to)))) {
    return 'same';
  }
  return to > from ? 'higher' : 'lower';
}

function runSide(side: {
  regime: string;
  overrides: Record<string, number | string>;
}): SeriesMap {
  const resolved = resolvedSliders(sliders, side.regime, side.overrides);
  return simulate(
    loadScenario({
      name: 'lesson-direction',
      seed: 1,
      ticks: LESSON_TICKS,
      sliders: resolved,
    }),
  ).metrics.series;
}

function ending(base: SeriesMap, variant: SeriesMap, id: MetricId): Direction {
  return direction(lastFinite(base[id]), lastFinite(variant[id]));
}

describe('lesson seed-1 directions', () => {
  it('locks the classroom answer-key directions for seed 1', () => {
    const prices = requireLesson('prices');
    const pricesSeries = runSide(prices.baseline);
    expect(direction(firstFinite(pricesSeries.priceApparel), lastFinite(pricesSeries.priceApparel))).toBe(
      'lower',
    );
    expect(
      direction(firstFinite(pricesSeries.priceElectronics), lastFinite(pricesSeries.priceElectronics)),
    ).toBe('lower');
    expect(direction(firstFinite(pricesSeries.priceHousing), lastFinite(pricesSeries.priceHousing))).toBe(
      'higher',
    );

    const interest = requireLesson('interest');
    const interestBase = runSide(interest.baseline);
    const hawkish = runSide(applyLessonLever(interest, 'hawkish'));
    expect(ending(interestBase, hawkish, 'interestRate')).toBe('lower');
    expect(ending(interestBase, hawkish, 'unemployment')).toBe('higher');

    const deficit = requireLesson('deficit');
    const deficitBase = runSide(deficit.baseline);
    const small = runSide(applyLessonLever(deficit, 'small'));
    const deficitSpend = runSide(applyLessonLever(deficit, 'deficit-spending'));
    expect(ending(deficitBase, small, 'priceLevel')).toBe('lower');
    expect(ending(deficitBase, deficitSpend, 'priceLevel')).toBe('lower');
    expect(ending(deficitBase, deficitSpend, 'unemployment')).toBe('same');

    const bitcoin = requireLesson('bitcoin');
    const bitcoinBase = runSide(bitcoin.baseline);
    const bitcoinSide = runSide(applyLessonLever(bitcoin, 'bitcoin'));
    expect(ending(bitcoinBase, bitcoinSide, 'priceLevel')).toBe('lower');
    expect(ending(bitcoinBase, bitcoinSide, 'unemployment')).toBe('higher');

    const gains = requireLesson('gains');
    const gainsBase = runSide(gains.baseline);
    const dividend = runSide(applyLessonLever(gains, 'ai-dividend'));
    expect(ending(gainsBase, dividend, 'ubiOutlay')).toBe('higher');
    expect(ending(gainsBase, dividend, 'unemployment')).toBe('same');
  }, 600_000);
});
