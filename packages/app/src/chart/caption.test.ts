import { describe, expect, it } from 'vitest';
import { comparisonCaption, type CaptionSeries } from './caption.js';

function series(
  label: string,
  baseline: readonly number[],
  variant: readonly number[],
  better?: 'higher' | 'lower',
): CaptionSeries {
  return better === undefined ? { label, baseline, variant } : { label, baseline, variant, better };
}

describe('comparisonCaption', () => {
  it('says every series matches when endings and paths agree', () => {
    expect(
      comparisonCaption([
        series('Mean well-being', [1, 2], [1, 2], 'higher'),
        series('Median well-being', [1, 2], [1, 2], 'higher'),
      ]),
    ).toBe('Every series matches the baseline.');
  });

  it('reports an ending improvement when the path agrees', () => {
    expect(comparisonCaption([series('Mean well-being', [1, 2], [1.5, 2.5], 'higher')])).toBe(
      'Mean well-being ends higher (2 → 2.50). That is an improvement.',
    );
  });

  it('reports an ending that is worse when the path agrees', () => {
    expect(comparisonCaption([series('Unemployment', [0.04, 0.04], [0.08, 0.08], 'lower')])).toBe(
      'Unemployment ends higher (0.0400 → 0.0800). That is worse.',
    );
  });

  it('judges both ending and path when they disagree', () => {
    expect(
      comparisonCaption([
        series('Unemployment', [0.08, 0.08, 0.08, 0.04], [0.1, 0.1, 0.1, 0.02], 'lower'),
      ]),
    ).toBe(
      'Unemployment ends lower (0.0400 → 0.0200), but it was higher in most months. The ending is an improvement, and most of the run was worse.',
    );
  });

  it('judges the path when the ending matches and most months differ', () => {
    expect(
      comparisonCaption([series('Mean well-being', [1, 1, 1, 2], [1.5, 1.5, 1.5, 2], 'higher')]),
    ).toBe(
      'Mean well-being matches the baseline at the end, but it was higher in most months. Most of the run was an improvement.',
    );
  });

  it('collapses matching series into one sentence', () => {
    expect(
      comparisonCaption([
        series('CPI', [100, 100], [108, 108]),
        series('Food and bev', [50, 50], [50, 50]),
        series('Apparel', [20, 20], [20, 20]),
        series('Energy', [10, 10], [10, 10]),
      ]),
    ).toBe('CPI ends higher (100 → 108). Food and bev, Apparel, and Energy match the baseline.');
  });

  it('keeps a directional series free of a verdict', () => {
    expect(comparisonCaption([series('CPI', [100, 100, 100, 108], [90, 90, 90, 120])])).toBe(
      'CPI ends higher (108 → 120), but it was lower in most months.',
    );
  });

  it('refuses to score mixed money units', () => {
    expect(comparisonCaption([series('CPI', [100, 200], [8, 9])], { mixedUnits: true })).toBe(
      'The baseline and scenario use different money units, so this chart does not score the scenario.',
    );
  });

  it('treats float noise as unchanged', () => {
    expect(comparisonCaption([series('Mean well-being', [1, 2], [1, 2 + 1e-12], 'higher')])).toBe(
      'Every series matches the baseline.',
    );
  });
});
