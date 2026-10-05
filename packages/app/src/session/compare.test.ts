import { describe, expect, it } from 'vitest';
import { getSlider, listSliders } from '../../../core/src/config/registry.js';
import { compareDiffs } from './compare.js';

const sliders = listSliders();

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
