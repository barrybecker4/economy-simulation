import { describe, expect, it } from 'vitest';
import { getSlider, listSliders } from '../../../core/src/config/registry.js';
import {
  alignComparisonFrame,
  canPinBaseline,
  canPromoteBaseline,
  clearBaseline,
  comparisonBundle,
  comparisonDiffs,
  comparisonFrame,
  compareDiffs,
  editRegime,
  editSlider,
  noteFailure,
  notePosted,
  noteResult,
  openComparisonSession,
  pinBaseline,
  prepareRun,
  promoteBaseline,
  resetDiffToBaseline,
  setSeed,
  setSeeds,
  setTicks,
  type ComparisonSession,
} from './compare.js';
import { sliderValue } from './sliders.js';
import type { RunSuccess } from '../worker/protocol.js';

const sliders = listSliders();

const FRAME_IDS = [
  'scale.households',
  'scale.firms',
  'scale.banks',
  'welfare.housingSecurityWeight',
  'welfare.weightInequality',
  'welfare.weightMedianWealth',
  'welfare.weightWellbeing',
  'welfare.weightStability',
  'population.growth',
  'household.trustInBanks',
] as const;

describe('comparisonFrame', () => {
  it('marks scale, scoring, and inert assumptions', () => {
    for (const id of FRAME_IDS) {
      expect(comparisonFrame(id)).toBe(true);
    }
    expect(comparisonFrame('government.ubiShare')).toBe(false);
    expect(comparisonFrame('regime.type')).toBe(false);
  });
});

describe('alignComparisonFrame', () => {
  it('rewrites only comparison-frame sliders to the baseline', () => {
    const baseline = {
      regime: 'fiat' as const,
      overrides: {
        'scale.households': 500,
        'welfare.weightWellbeing': 0.4,
        'population.growth': 0.01,
        'government.ubiShare': 0.1,
      },
    };
    const live = {
      regime: 'bitcoin' as const,
      overrides: {
        'scale.households': 2000,
        'scale.firms': 200,
        'welfare.weightWellbeing': 0.9,
        'population.growth': -0.005,
        'household.trustInBanks': 0.2,
        'government.ubiShare': 0.4,
        'ai.bullishness': 2,
      },
    };

    const aligned = alignComparisonFrame(sliders, live, baseline);

    expect(aligned.regime).toBe('bitcoin');
    expect(sliderValue(getSlider('scale.households'), aligned.regime, aligned.overrides)).toBe(500);
    expect(sliderValue(getSlider('scale.firms'), aligned.regime, aligned.overrides)).toBe(
      getSlider('scale.firms').default,
    );
    expect(
      sliderValue(getSlider('welfare.weightWellbeing'), aligned.regime, aligned.overrides),
    ).toBe(0.4);
    expect(sliderValue(getSlider('population.growth'), aligned.regime, aligned.overrides)).toBe(
      0.01,
    );
    expect(
      sliderValue(getSlider('household.trustInBanks'), aligned.regime, aligned.overrides),
    ).toBe(getSlider('household.trustInBanks').default);
    expect(aligned.overrides['government.ubiShare']).toBe(0.4);
    expect(aligned.overrides['ai.bullishness']).toBe(2);
  });

  it('leaves an already-aligned live side unchanged aside from omitted defaults', () => {
    const side = {
      regime: 'fiat' as const,
      overrides: { 'government.ubiShare': 0.25 },
    };
    const aligned = alignComparisonFrame(sliders, side, side);
    expect(aligned.regime).toBe('fiat');
    expect(aligned.overrides).toEqual({ 'government.ubiShare': 0.25 });
  });
});

describe('compareDiffs', () => {
  it('returns only values that differ, including the regime', () => {
    expect(
      compareDiffs(sliders, { regime: 'fiat', overrides: {} }, { regime: 'fiat', overrides: {} }),
    ).toEqual([]);

    const diffs = compareDiffs(
      sliders,
      { regime: 'fiat', overrides: { 'government.ubiShare': 0.1 } },
      {
        regime: 'bitcoin',
        overrides: { 'government.ubiShare': 0.4, 'ai.bullishness': 2 },
      },
    );
    expect(diffs).toEqual([
      {
        id: 'regime.type',
        label: 'Monetary regime',
        baseline: 'fiat',
        variant: 'bitcoin',
      },
      {
        id: 'government.ubiShare',
        label: getSlider('government.ubiShare').label,
        baseline: 0.1,
        variant: 0.4,
      },
      {
        id: 'ai.bullishness',
        label: 'AI bullishness',
        baseline: getSlider('ai.bullishness').default,
        variant: 2,
      },
    ]);
  });

  it('treats an override that matches the default as unchanged', () => {
    const ubi = getSlider('government.ubiShare');
    expect(ubi.kind).toBe('number');
    if (ubi.kind !== 'number') {
      return;
    }
    expect(
      compareDiffs(
        sliders,
        { regime: 'fiat', overrides: {} },
        { regime: 'fiat', overrides: { 'government.ubiShare': ubi.default } },
      ),
    ).toEqual([]);
  });
});

function finishedRun(): RunSuccess {
  return { kind: 'run', ticks: [0, 1], series: {} };
}

function posted(session: ComparisonSession, result: RunSuccess): ComparisonSession {
  const prepared = prepareRun(session, sliders);
  if (prepared.blocked) {
    throw new Error('expected a run to start');
  }
  return noteResult(notePosted(prepared.session), result);
}

describe('comparison session', () => {
  it('pins the shown run and snaps frame sliders to that baseline', () => {
    const result = finishedRun();
    let session = openComparisonSession({
      seed: 3,
      ticks: 24,
      regime: 'fiat',
      overrides: { 'scale.households': 500, 'government.ubiShare': 0.1 },
    });
    session = posted(session, result);
    session = editSlider(session, getSlider('scale.households'), '2000');
    session = editSlider(session, getSlider('government.ubiShare'), '0.4');
    session = editRegime(session, 'bitcoin');

    const update = pinBaseline(session, sliders);

    expect(update.status).toMatch(/Baseline pinned/);
    expect(update.session.pin?.result).toBe(result);
    expect(update.session.pin?.regime).toBe('fiat');
    expect(update.session.pin?.overrides['government.ubiShare']).toBe(0.1);
    expect(update.session.regime).toBe('bitcoin');
    expect(
      sliderValue(getSlider('scale.households'), update.session.regime, update.session.overrides),
    ).toBe(500);
    expect(update.session.overrides['government.ubiShare']).toBe(0.4);
    expect(canPinBaseline(update.session)).toBe(true);
    expect(canPromoteBaseline(update.session)).toBe(false);
  });

  it('refuses to pin when there is no result', () => {
    const session = openComparisonSession({
      seed: 1,
      ticks: 24,
      regime: 'fiat',
      overrides: {},
    });
    const update = pinBaseline(session, sliders);
    expect(update.session).toBe(session);
    expect(update.status).toBeUndefined();
  });

  it('pins a multi-seed band and still allows multi-seed variants', () => {
    const band: RunSuccess = {
      kind: 'band',
      ticks: [0, 1],
      series: {},
      bands: {},
    };
    let session = posted(
      openComparisonSession({
        seed: 1,
        ticks: 24,
        seeds: 5,
        regime: 'fiat',
        overrides: { 'scale.households': 500 },
      }),
      band,
    );
    session = pinBaseline(session, sliders).session;
    expect(session.seeds).toBe(5);
    expect(canPinBaseline(session)).toBe(true);
    session = editSlider(session, getSlider('scale.households'), '2000');
    expect(setSeeds(session, 3).seeds).toBe(3);
    const prepared = prepareRun(setSeeds(session, 5), sliders);
    expect(prepared.blocked).toBe(false);
    if (prepared.blocked) {
      return;
    }
    expect(
      sliderValue(
        getSlider('scale.households'),
        prepared.session.regime,
        prepared.session.overrides,
      ),
    ).toBe(500);
  });

  it('snaps a variant run while pinned', () => {
    let session = posted(
      openComparisonSession({
        seed: 1,
        ticks: 24,
        regime: 'fiat',
        overrides: { 'scale.households': 500 },
      }),
      finishedRun(),
    );
    session = pinBaseline(session, sliders).session;
    session = editSlider(session, getSlider('scale.households'), '2000');
    const prepared = prepareRun(session, sliders);
    expect(prepared.blocked).toBe(false);
    if (prepared.blocked) {
      return;
    }
    expect(
      sliderValue(
        getSlider('scale.households'),
        prepared.session.regime,
        prepared.session.overrides,
      ),
    ).toBe(500);
  });

  it('keeps frame sliders fixed and still accepts other edits', () => {
    let session = posted(
      openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    session = pinBaseline(session, sliders).session;
    const frozen = editSlider(session, getSlider('scale.households'), '4000');
    expect(frozen).toBe(session);
    const edited = editSlider(session, getSlider('government.ubiShare'), '0.4');
    expect(edited.overrides['government.ubiShare']).toBe(0.4);
  });

  it('overlays a later run and reads census counts from each side', () => {
    const baseline = finishedRun();
    const variant = finishedRun();
    let session = posted(
      openComparisonSession({
        seed: 1,
        ticks: 24,
        regime: 'fiat',
        overrides: { 'scale.households': 500, 'ai.ownershipConcentration': 0.2 },
      }),
      baseline,
    );
    session = pinBaseline(session, sliders).session;
    session = editSlider(session, getSlider('ai.ownershipConcentration'), '0.9');
    session = editRegime(session, 'bitcoin');
    const prepared = prepareRun(session, sliders);
    if (prepared.blocked) {
      throw new Error('expected a variant run');
    }
    session = noteResult(notePosted(prepared.session), variant);
    session = editRegime(session, 'fiat');

    const same = comparisonBundle(
      pinBaseline(
        posted(
          openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
          baseline,
        ),
        sliders,
      ).session,
    );
    expect(same.variant?.result).toBe(baseline);
    expect(same.baseline).toBeNull();

    const bundle = comparisonBundle(session);
    expect(bundle.variant?.result).toBe(variant);
    expect(bundle.variant?.regime).toBe('bitcoin');
    expect(bundle.variant?.households).toBe(500);
    expect(bundle.variant?.ownership).toBe(0.9);
    expect(bundle.variant?.transitionLength).toBe(0);
    expect(bundle.baseline?.result).toBe(baseline);
    expect(bundle.baseline?.regime).toBe('fiat');
    expect(bundle.baseline?.households).toBe(500);
    expect(bundle.baseline?.ownership).toBe(0.2);
    expect(bundle.baseline?.transitionLength).toBe(0);
    expect(canPromoteBaseline(session)).toBe(true);
  });

  it('clears the pin when the seed or month count leaves the baseline', () => {
    let session = posted(
      openComparisonSession({ seed: 4, ticks: 24, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    session = pinBaseline(session, sliders).session;
    expect(setSeed(session, 4).pin).not.toBeNull();
    expect(setSeed(session, 5).pin).toBeNull();
    expect(setTicks(session, 36).pin).toBeNull();
  });

  it('promotes the variant and can reset one diff', () => {
    let session = posted(
      openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    session = pinBaseline(session, sliders).session;
    session = editSlider(session, getSlider('government.ubiShare'), '0.4');
    expect(comparisonDiffs(session, sliders).map((diff) => diff.id)).toContain(
      'government.ubiShare',
    );
    session = posted(session, finishedRun());
    const promoted = promoteBaseline(session, sliders);
    expect(promoted.status).toMatch(/Variant is now the baseline/);
    expect(promoted.session.pin?.result).toBe(session.result);
    const cleared = clearBaseline(promoted.session);
    expect(cleared.session.pin).toBeNull();
    expect(cleared.status).toBe('Run ready.');
  });

  it('resets a diff to the baseline value', () => {
    let session = posted(
      openComparisonSession({
        seed: 1,
        ticks: 24,
        regime: 'fiat',
        overrides: { 'government.ubiShare': 0.1 },
      }),
      finishedRun(),
    );
    session = pinBaseline(session, sliders).session;
    session = editSlider(session, getSlider('government.ubiShare'), '0.4');
    session = resetDiffToBaseline(session, 'government.ubiShare');
    expect(session.overrides['government.ubiShare']).toBe(0.1);
  });

  it('drops the shown result on failure and keeps the pin', () => {
    let session = posted(
      openComparisonSession({ seed: 1, ticks: 24, regime: 'fiat', overrides: {} }),
      finishedRun(),
    );
    session = pinBaseline(session, sliders).session;
    session = noteFailure(session);
    expect(session.result).toBeNull();
    expect(session.pin).not.toBeNull();
    expect(comparisonBundle(session).variant).toBeNull();
    expect(clearBaseline(session).status).toBe('Set the parameters and run.');
  });
});
