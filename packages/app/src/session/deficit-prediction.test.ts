import { describe, expect, it } from 'vitest';
import { loadScenario } from '../../../core/src/config/load.js';
import { listSliders } from '../../../core/src/config/registry.js';
import { simulate } from '../../../core/src/sim/simulate.js';
import { LESSON_RELATIVE_BAND } from '../lesson/readout.js';
import { applyLessonLever, lessonRunSeed, lessonRunTicks, requireLesson } from './lessons.js';
import { predictionOutcome } from './prediction.js';
import { resolvedSliders } from './sliders.js';
import { endingDirection } from './snapshot.js';
import type { RunSuccess } from '../worker/protocol.js';

const sliders = listSliders();
const lesson = requireLesson('deficit');

function runSide(addsDemand: boolean, pricesFollowDemand: boolean, deficit: boolean): RunSuccess {
  const choice = deficit ? 'deficit-spending' : 'balanced';
  const side = applyLessonLever(lesson, choice, { addsDemand, pricesFollowDemand });
  const resolved = resolvedSliders(sliders, side.regime, side.overrides);
  const result = simulate(
    loadScenario({
      name: 'deficit-prediction',
      seed: lessonRunSeed(lesson),
      ticks: lessonRunTicks(lesson),
      sliders: resolved,
    }),
  );
  const series = result.metrics.series;
  const ticks = Array.from({ length: result.ticks }, (_, index) => index);
  const out: Record<string, number[]> = {};
  for (const [id, values] of Object.entries(series)) {
    out[id] = values.flatMap((value) => (value === null ? [] : [value]));
  }
  return { kind: 'run', ticks, series: out };
}

function priceDirection(addsDemand: boolean, pricesFollowDemand: boolean): 'higher' | 'lower' | 'same' {
  const baseline = runSide(addsDemand, pricesFollowDemand, false);
  const variant = runSide(addsDemand, pricesFollowDemand, true);
  return endingDirection(baseline, variant, 'priceLevel', LESSON_RELATIVE_BAND);
}

describe('deficit lesson price guess', () => {
  it('scores against the matched baseline with a two percent same band', () => {
    const baseline = runSide(false, false, false);
    const variant = runSide(false, false, true);
    const direction = endingDirection(baseline, variant, 'priceLevel', LESSON_RELATIVE_BAND);
    const feedback = predictionOutcome(lesson, 'prices-same', baseline, variant);
    expect(direction).toBe('same');
    expect(feedback.matched).toBe(true);
  });

  it('locks seed-1 directions for each assumption pair', () => {
    expect(priceDirection(false, false)).toBe('same');
    expect(priceDirection(true, false)).toBe('same');
    expect(priceDirection(false, true)).toBe('lower');
    expect(priceDirection(true, true)).toBe('higher');
  });
});
