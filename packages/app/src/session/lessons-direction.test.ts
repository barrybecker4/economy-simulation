import { describe, expect, it } from 'vitest';
import { loadScenario } from '../../../core/src/config/load.js';
import { listSliders } from '../../../core/src/config/registry.js';
import type { MetricId } from '../../../core/src/metrics/metrics.js';
import { simulate } from '../../../core/src/sim/simulate.js';
import { LESSON_RELATIVE_BAND } from '../lesson/readout.js';
import {
  applyLessonLever,
  lessonRunSeed,
  lessonRunTicks,
  requireLesson,
} from './lessons.js';
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

function runSide(
  side: {
    regime: string;
    overrides: Record<string, number | string>;
  },
  lesson = requireLesson('prices'),
): SeriesMap {
  const resolved = resolvedSliders(sliders, side.regime, side.overrides);
  return simulate(
    loadScenario({
      name: 'lesson-direction',
      seed: lessonRunSeed(lesson),
      ticks: lessonRunTicks(lesson),
      sliders: resolved,
    }),
  ).metrics.series;
}

function ending(
  base: SeriesMap,
  variant: SeriesMap,
  id: MetricId,
  relativeBand = 0,
): Direction {
  const from = lastFinite(base[id]);
  const to = lastFinite(variant[id]);
  if (relativeBand > 0 && from > 0 && Math.abs(to / from - 1) <= relativeBand) {
    return 'same';
  }
  return direction(from, to);
}

describe('lesson seed-1 directions', () => {
  it('locks the classroom answer-key directions for seed 1', () => {
    const prices = requireLesson('prices');
    const pricesSeries = runSide(prices.baseline, prices);
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
    const interestBase = runSide(interest.baseline, interest);
    const hawkish = runSide(applyLessonLever(interest, 'hawkish'), interest);
    expect(ending(interestBase, hawkish, 'interestRate')).toBe('lower');
    expect(ending(interestBase, hawkish, 'unemployment')).toBe('higher');

    const deficit = requireLesson('deficit');
    const deficitBase = runSide(deficit.baseline, deficit);
    const deficitSpend = runSide(applyLessonLever(deficit, 'deficit-spending'), deficit);
    expect(ending(deficitBase, deficitSpend, 'priceLevel', LESSON_RELATIVE_BAND)).toBe('same');
    expect(ending(deficitBase, deficitSpend, 'unemployment')).toBe('same');

    const bitcoin = requireLesson('bitcoin');
    const bitcoinBase = runSide(bitcoin.baseline, bitcoin);
    const bitcoinSide = runSide(applyLessonLever(bitcoin, 'bitcoin'), bitcoin);
    expect(ending(bitcoinBase, bitcoinSide, 'priceLevel')).toBe('lower');
    expect(ending(bitcoinBase, bitcoinSide, 'unemployment')).toBe('higher');

    const gains = requireLesson('gains');
    const gainsBase = runSide(gains.baseline, gains);
    expect(gainsBase.ubiOutlay.every((value) => value === 0 || value === null)).toBe(true);
    const modestAi = runSide(applyLessonLever(gains, 'modest'), gains);
    expect(ending(gainsBase, modestAi, 'ubiOutlay')).toBe('higher');
    const extremeAi = runSide(applyLessonLever(gains, 'extreme'), gains);
    expect(ending(gainsBase, extremeAi, 'ubiOutlay')).toBe('higher');
    expect(ending(gainsBase, extremeAi, 'unemployment')).toBe('higher');
  }, 600_000);
});
