import { describe, expect, it } from 'vitest';
import {
  HOUSING_PRESSURE_MAX,
  HOUSING_PRESSURE_MIN,
  HOUSING_PRESSURE_SOFT,
  constructionCostFactor,
  homePriceMonthsOf,
  housingPriceMultiple,
  nextHousingPressure,
} from './housing.js';

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

  it('cheapens the sticker with construction productivity over years', () => {
    expect(constructionCostFactor(0.005, 0)).toBe(1);
    expect(constructionCostFactor(0.005, 10)).toBeCloseTo(1.005 ** -10, 12);
    expect(
      homePriceMonthsOf({
        scarcity: 1,
        monetaryPremium: 0,
        normalInflation: 0.02,
        inflationTarget: 0.02,
        constructionProductivity: 0.005,
        years: 10,
      }),
    ).toBeCloseTo(48 * 1.005 ** -10, 10);
  });
});

describe('nextHousingPressure', () => {
  it('holds scarcity when demand is neutral and supply is flat', () => {
    expect(
      nextHousingPressure({
        pressure: 1.2,
        demand: 0.55,
        supplyGrowthMonthly: 0,
      }),
    ).toBeCloseTo(1.2, 12);
  });

  it('fades positive demand pressure as scarcity approaches the soft ceiling', () => {
    const low = nextHousingPressure({
      pressure: 1,
      demand: 0.75,
      supplyGrowthMonthly: 0,
    });
    const nearSoft = nextHousingPressure({
      pressure: HOUSING_PRESSURE_SOFT - 0.01,
      demand: 0.75,
      supplyGrowthMonthly: 0,
    });
    const atSoft = nextHousingPressure({
      pressure: HOUSING_PRESSURE_SOFT,
      demand: 0.75,
      supplyGrowthMonthly: 0,
    });
    expect(low).toBeGreaterThan(1);
    expect(nearSoft - (HOUSING_PRESSURE_SOFT - 0.01)).toBeLessThan(low - 1);
    expect(atSoft).toBe(HOUSING_PRESSURE_SOFT);
  });

  it('lets supply lower pressure when demand cannot push above the soft ceiling', () => {
    const eased = nextHousingPressure({
      pressure: HOUSING_PRESSURE_SOFT,
      demand: 0.9,
      supplyGrowthMonthly: 0.01,
    });
    expect(eased).toBeLessThan(HOUSING_PRESSURE_SOFT);
    expect(eased).toBeCloseTo(HOUSING_PRESSURE_SOFT / 1.01, 12);
  });

  it('hard-clamps to the numerical bounds', () => {
    expect(
      nextHousingPressure({
        pressure: HOUSING_PRESSURE_MAX,
        demand: 0.9,
        supplyGrowthMonthly: -0.5,
      }),
    ).toBe(HOUSING_PRESSURE_MAX);
    expect(
      nextHousingPressure({
        pressure: HOUSING_PRESSURE_MIN,
        demand: 0.1,
        supplyGrowthMonthly: 0.5,
      }),
    ).toBe(HOUSING_PRESSURE_MIN);
  });
});
