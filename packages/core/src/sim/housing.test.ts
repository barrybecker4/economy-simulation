import { describe, expect, it } from 'vitest';
import { homePriceMonthsOf, housingPriceMultiple } from './housing.js';

describe('housing monetary premium multiple', () => {
  it('leaves the multiple at one when the premium is zero', () => {
    expect(
      housingPriceMultiple({
        monetaryPremium: 0,
        normalInflation: 0.02,
        inflationTarget: 0.02,
      }),
    ).toBe(1);
    expect(
      housingPriceMultiple({
        monetaryPremium: 0,
        normalInflation: -0.01,
        inflationTarget: 0.02,
      }),
    ).toBe(1);
  });

  it('keeps the fiat-target price when the regime path matches the inflation target', () => {
    expect(
      housingPriceMultiple({
        monetaryPremium: 0.5,
        normalInflation: 0.02,
        inflationTarget: 0.02,
      }),
    ).toBe(1);
    expect(
      homePriceMonthsOf({
        scarcity: 1,
        monetaryPremium: 0.5,
        normalInflation: 0.02,
        inflationTarget: 0.02,
      }),
    ).toBe(48);
  });

  it('sheds the premium under a deflationary path', () => {
    expect(
      housingPriceMultiple({
        monetaryPremium: 0.5,
        normalInflation: -0.01,
        inflationTarget: 0.02,
      }),
    ).toBe(0.5);
    expect(
      homePriceMonthsOf({
        scarcity: 1,
        monetaryPremium: 0.5,
        normalInflation: -0.01,
        inflationTarget: 0.02,
      }),
    ).toBe(24);
  });

  it('sheds the premium when the inflation target is zero', () => {
    expect(
      housingPriceMultiple({
        monetaryPremium: 0.5,
        normalInflation: 0,
        inflationTarget: 0,
      }),
    ).toBe(0.5);
  });

  it('multiplies scarcity after the premium', () => {
    expect(
      homePriceMonthsOf({
        scarcity: 2,
        monetaryPremium: 0.5,
        normalInflation: -0.01,
        inflationTarget: 0.02,
      }),
    ).toBe(48);
  });
});
