import { describe, expect, it } from 'vitest';
import { BASKET_WEIGHTS, basketAverage, splitBasket, type CategoryProductivity } from './basket.js';

const baseline: CategoryProductivity = {
  food: 0.01,
  energy: 0.01,
  apparel: 0.01,
  transportation: 0.01,
  medical: 0.01,
  education: 0.01,
  recreation: 0.01,
  electronics: 0.01,
};

describe('CPI basket', () => {
  it('uses weights that sum to one', () => {
    const total = Object.values(BASKET_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1, 12);
  });

  it('puts every category on the CPI when each growth rate matches the baseline', () => {
    const split = splitBasket({
      cpi: 120,
      years: 10,
      baselineGrowth: 0.01,
      productivity: baseline,
      housingSupplyGrowth: 0.01,
      deflationPenalty: 0,
    });
    for (const price of Object.values(split)) {
      expect(price).toBeCloseTo(120, 8);
    }
  });

  it('keeps the expenditure-weighted average equal to the CPI', () => {
    const split = splitBasket({
      cpi: 130,
      years: 8,
      baselineGrowth: 0.01,
      productivity: { ...baseline, electronics: 0.08, apparel: 0.04, energy: 0 },
      housingSupplyGrowth: 0,
      deflationPenalty: 0.05,
    });
    expect(basketAverage(split)).toBeCloseTo(130, 8);
  });

  it('cheapens a category when its productivity rises, and housing when supply is tighter', () => {
    const slow = splitBasket({
      cpi: 100,
      years: 10,
      baselineGrowth: 0.01,
      productivity: { ...baseline, electronics: 0.02 },
      housingSupplyGrowth: 0.02,
      deflationPenalty: 0,
    });
    const fast = splitBasket({
      cpi: 100,
      years: 10,
      baselineGrowth: 0.01,
      productivity: { ...baseline, electronics: 0.2 },
      housingSupplyGrowth: -0.01,
      deflationPenalty: 0,
    });
    expect(fast.priceElectronics / fast.priceFood).toBeLessThan(
      slow.priceElectronics / slow.priceFood,
    );
    expect(fast.priceHousing).toBeGreaterThan(slow.priceHousing);
  });

  it('cuts the housing price when the deflation penalty rises', () => {
    const calm = splitBasket({
      cpi: 100,
      years: 5,
      baselineGrowth: 0.01,
      productivity: baseline,
      housingSupplyGrowth: 0,
      deflationPenalty: 0,
    });
    const pressed = splitBasket({
      cpi: 100,
      years: 5,
      baselineGrowth: 0.01,
      productivity: baseline,
      housingSupplyGrowth: 0,
      deflationPenalty: 0.4,
    });
    expect(pressed.priceHousing).toBeLessThan(calm.priceHousing);
    expect(basketAverage(pressed)).toBeCloseTo(100, 8);
  });

  it('cuts the housing price when the monetary-premium multiple falls', () => {
    const full = splitBasket({
      cpi: 100,
      years: 5,
      baselineGrowth: 0.01,
      productivity: baseline,
      housingSupplyGrowth: 0,
      deflationPenalty: 0,
      monetaryMultiple: 1,
    });
    const shed = splitBasket({
      cpi: 100,
      years: 5,
      baselineGrowth: 0.01,
      productivity: baseline,
      housingSupplyGrowth: 0,
      deflationPenalty: 0,
      monetaryMultiple: 0.5,
    });
    expect(shed.priceHousing).toBeLessThan(full.priceHousing);
    expect(basketAverage(shed)).toBeCloseTo(100, 8);
  });
});
