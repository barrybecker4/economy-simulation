import { describe, expect, it } from 'vitest';
import { getSlider, listSliders } from '../../../core/src/config/registry.js';
import { alignComparisonFrame, compareDiffs, comparisonFrame } from './compare.js';
import { sliderValue } from './sliders.js';

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
    expect(sliderValue(getSlider('welfare.weightWellbeing'), aligned.regime, aligned.overrides)).toBe(
      0.4,
    );
    expect(sliderValue(getSlider('population.growth'), aligned.regime, aligned.overrides)).toBe(0.01);
    expect(sliderValue(getSlider('household.trustInBanks'), aligned.regime, aligned.overrides)).toBe(
      getSlider('household.trustInBanks').default,
    );
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
      compareDiffs(
        sliders,
        { regime: 'fiat', overrides: {} },
        { regime: 'fiat', overrides: {} },
      ),
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
