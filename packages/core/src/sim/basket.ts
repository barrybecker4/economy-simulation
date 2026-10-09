import type { MetricId } from '../metrics/metrics.js';

/**
 * Expenditure shares of the CPI.
 * December 2024 CPI-U relative importance, with household energy removed from
 * housing and the rest of energy removed from transportation. Electronics is a
 * one-percent slice. Education is tuition and childcare, not communication.
 * The shares are rescaled so these categories sum to one.
 */
export const BASKET_WEIGHTS = {
  food: 0.153025,
  housing: 0.431578,
  energy: 0.065483,
  apparel: 0.026126,
  transportation: 0.143143,
  medical: 0.087152,
  education: 0.027211,
  recreation: 0.055749,
  electronics: 0.010533,
} as const;

export interface CategoryProductivity {
  food: number;
  energy: number;
  apparel: number;
  transportation: number;
  medical: number;
  education: number;
  recreation: number;
  electronics: number;
}

export interface BasketSplit {
  priceFood: number;
  priceHousing: number;
  priceEnergy: number;
  priceApparel: number;
  priceTransportation: number;
  priceMedical: number;
  priceEducation: number;
  priceRecreation: number;
  priceElectronics: number;
  /** Expenditure-weighted price of the basket with electronics removed. */
  priceGeneral: number;
}

export const BASKET_METRICS = [
  'priceFood',
  'priceHousing',
  'priceEnergy',
  'priceApparel',
  'priceTransportation',
  'priceMedical',
  'priceEducation',
  'priceRecreation',
  'priceElectronics',
] as const satisfies readonly MetricId[];

export function splitBasket(input: {
  cpi: number;
  years: number;
  baselineGrowth: number;
  productivity: CategoryProductivity;
  housingSupplyGrowth: number;
  deflationPenalty: number;
  /** Extra scarcity from the housing market. Omitted or 1 keeps the formula price. */
  housingPressure?: number;
  /** Monetary-premium multiple on housing. Omitted or 1 keeps the formula price. */
  monetaryMultiple?: number;
}): BasketSplit {
  const relative = (growth: number): number =>
    (1 + input.baselineGrowth) ** input.years / (1 + growth) ** input.years;
  const housing =
    ((relative(0) * (1 - input.deflationPenalty)) /
      (1 + input.housingSupplyGrowth) ** input.years) *
    (input.housingPressure ?? 1) *
    (input.monetaryMultiple ?? 1);
  const unscaled = {
    food: relative(input.productivity.food),
    housing,
    energy: relative(input.productivity.energy),
    apparel: relative(input.productivity.apparel),
    transportation: relative(input.productivity.transportation),
    medical: relative(input.productivity.medical),
    education: relative(input.productivity.education),
    recreation: relative(input.productivity.recreation),
    electronics: relative(input.productivity.electronics),
  };
  const weighted = (Object.keys(BASKET_WEIGHTS) as (keyof typeof BASKET_WEIGHTS)[]).reduce(
    (sum, key) => sum + BASKET_WEIGHTS[key] * unscaled[key],
    0,
  );
  const scale = weighted > 0 ? input.cpi / weighted : input.cpi;
  const priceElectronics = scale * unscaled.electronics;
  const rest = 1 - BASKET_WEIGHTS.electronics;
  return {
    priceFood: scale * unscaled.food,
    priceHousing: scale * unscaled.housing,
    priceEnergy: scale * unscaled.energy,
    priceApparel: scale * unscaled.apparel,
    priceTransportation: scale * unscaled.transportation,
    priceMedical: scale * unscaled.medical,
    priceEducation: scale * unscaled.education,
    priceRecreation: scale * unscaled.recreation,
    priceElectronics,
    priceGeneral:
      rest > 0 ? (input.cpi - BASKET_WEIGHTS.electronics * priceElectronics) / rest : input.cpi,
  };
}

export function basketAverage(split: BasketSplit): number {
  return (
    BASKET_WEIGHTS.food * split.priceFood +
    BASKET_WEIGHTS.housing * split.priceHousing +
    BASKET_WEIGHTS.energy * split.priceEnergy +
    BASKET_WEIGHTS.apparel * split.priceApparel +
    BASKET_WEIGHTS.transportation * split.priceTransportation +
    BASKET_WEIGHTS.medical * split.priceMedical +
    BASKET_WEIGHTS.education * split.priceEducation +
    BASKET_WEIGHTS.recreation * split.priceRecreation +
    BASKET_WEIGHTS.electronics * split.priceElectronics
  );
}
