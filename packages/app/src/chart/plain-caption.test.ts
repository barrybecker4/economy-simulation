import { describe, expect, it } from 'vitest';
import { plainComparisonCaption, plainEndingSentence, plainRatioWords } from './plain-caption.js';

describe('plainRatioWords', () => {
  it('names same, half, and double', () => {
    expect(plainRatioWords(100, 100)).toBe('about the same');
    expect(plainRatioWords(100, 200)).toBe('about doubled');
    expect(plainRatioWords(100, 50)).toBe('about half');
  });

  it('falls back to higher or lower', () => {
    expect(plainRatioWords(100, 120)).toBe('higher');
    expect(plainRatioWords(100, 80)).toBe('lower');
  });
});

describe('plainEndingSentence', () => {
  it('writes a classroom sentence', () => {
    expect(plainEndingSentence('CPI', 100, 200)).toBe('CPI ends about doubled.');
    expect(plainEndingSentence('CPI', 100, 100)).toBe('CPI ends about the same.');
  });
});

describe('plainComparisonCaption', () => {
  it('summarizes paired endings in words', () => {
    expect(
      plainComparisonCaption([
        { label: 'CPI', baseline: [100, 100], variant: [100, 200] },
        { label: 'Unemployment', baseline: [0.05, 0.05], variant: [0.05, 0.05] },
      ]),
    ).toBe('CPI ends about doubled. Unemployment matches the baseline.');
  });
});
