import { describe, expect, it } from 'vitest';
import { getSlider, listSliders } from '../../../core/src/config/registry.js';
import {
  editRegime,
  editSlider,
  notePosted,
  noteResult,
  openComparisonSession,
  pinBaseline,
  prepareRun,
  setSeed,
  setSeeds,
  setTicks,
} from './compare.js';
import {
  GUIDE_STEPS,
  guideOpenFromStorage,
  NEXT_CHANGE,
  NEXT_PIN,
  NEXT_READ,
  NEXT_RERUN,
  NEXT_RUN,
  nextStep,
} from './guide.js';
import type { RunSuccess } from '../worker/protocol.js';

const sliders = listSliders();

function finishedRun(): RunSuccess {
  return { kind: 'run', ticks: [0, 1], series: {} };
}

function posted(
  session: ReturnType<typeof openComparisonSession>,
  result: RunSuccess,
): ReturnType<typeof openComparisonSession> {
  const prepared = prepareRun(session, sliders);
  if (prepared.blocked) {
    throw new Error('expected a run to start');
  }
  return noteResult(notePosted(prepared.session), result);
}

describe('guideOpenFromStorage', () => {
  it('opens when storage is missing or unreadable', () => {
    expect(guideOpenFromStorage(null)).toBe(true);
    expect(guideOpenFromStorage(undefined)).toBe(true);
    expect(guideOpenFromStorage('')).toBe(true);
    expect(guideOpenFromStorage('open')).toBe(true);
    expect(guideOpenFromStorage('garbage')).toBe(true);
  });

  it('closes only for the closed token', () => {
    expect(guideOpenFromStorage('closed')).toBe(false);
  });
});

describe('GUIDE_STEPS', () => {
  it('has four short steps', () => {
    expect(GUIDE_STEPS).toHaveLength(4);
    expect(GUIDE_STEPS[0]).toMatch(/Press Run/);
    expect(GUIDE_STEPS[1]).toMatch(/Parameters/);
    expect(GUIDE_STEPS[2]).toMatch(/Pin as baseline/);
    expect(GUIDE_STEPS[3]).toMatch(/address bar/);
  });
});

describe('nextStep', () => {
  it('asks for a run when there are no charts', () => {
    const session = openComparisonSession({
      seed: 1,
      ticks: 24,
      regime: 'fiat',
      overrides: {},
    });
    expect(nextStep(session)).toBe(NEXT_RUN);
  });

  it('asks to pin after a matching run', () => {
    const session = posted(
      openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    expect(nextStep(session)).toBe(NEXT_PIN);
  });

  it('asks to rerun when a slider differs from the charts', () => {
    let session = posted(
      openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    session = editSlider(session, getSlider('government.ubiShare'), '0.4');
    expect(nextStep(session)).toBe(NEXT_RERUN);
  });

  it('asks to rerun when the seed differs from the charts', () => {
    let session = posted(
      openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    session = setSeed(session, 9);
    expect(nextStep(session)).toBe(NEXT_RERUN);
  });

  it('asks to rerun when months or seed count differ from the charts', () => {
    let session = posted(
      openComparisonSession({ seed: 1, ticks: 24, seeds: 1, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    expect(nextStep(setTicks(session, 36))).toBe(NEXT_RERUN);
    expect(nextStep(setSeeds(session, 3))).toBe(NEXT_RERUN);
  });

  it('asks to rerun when the regime differs from the charts', () => {
    let session = posted(
      openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    session = editRegime(session, 'bitcoin');
    expect(nextStep(session)).toBe(NEXT_RERUN);
  });

  it('asks to change a setting when a baseline is pinned with no second path', () => {
    let session = posted(
      openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    session = pinBaseline(session, sliders).session;
    expect(nextStep(session)).toBe(NEXT_CHANGE);
  });

  it('points at captions when a second path overlays the baseline', () => {
    const baseline = finishedRun();
    const variant = finishedRun();
    let session = posted(
      openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
      baseline,
    );
    session = pinBaseline(session, sliders).session;
    session = editRegime(session, 'bitcoin');
    session = posted(session, variant);
    expect(nextStep(session)).toBe(NEXT_READ);
  });
});
