import { NATURAL_UNEMPLOYMENT } from './rules.js';
import { clamp, monthlyFromAnnual } from './stats.js';
import { yearOverYear } from './yoy.js';
import type { Economy } from './economy.js';
import type { Firm, Household } from './types.js';

export function humanWeight(economy: Economy): number {
  return 1 / Math.max(economy.displacementFactor, 1);
}

export function naturalUnemployment(economy: Economy): number {
  return 1 - (1 - NATURAL_UNEMPLOYMENT) * humanWeight(economy);
}

export function referenceWorkersPerFirm(economy: Economy): number {
  const reference = Math.round(economy.households.length * (1 - NATURAL_UNEMPLOYMENT));
  return Math.max(1, Math.ceil(reference / Math.max(economy.firms.length, 1)));
}

export function employedCount(economy: Economy): number {
  return economy.households.reduce((sum, household) => sum + (household.employer >= 0 ? 1 : 0), 0);
}

export function unemploymentRate(economy: Economy): number {
  if (economy.households.length === 0) {
    throw new Error('Unemployment needs at least one household');
  }
  return 1 - employedCount(economy) / economy.households.length;
}

/** Unemployment above the natural rate. Zero when the market is tighter than that. */
export function unemploymentGap(economy: Economy): number {
  return Math.max(0, unemploymentRate(economy) - naturalUnemployment(economy));
}

/** Signed labor-market gap, scaled by how much human labor still matters. */
export function outputGap(economy: Economy): number {
  return (naturalUnemployment(economy) - unemploymentRate(economy)) * humanWeight(economy);
}

export function pay(household: Household, firm: Firm): number {
  return Math.max(1, Math.round(firm.wage * household.skill));
}

export function priceTrend(economy: Economy): number {
  const annual =
    economy.params.anchorWeight <= 0 ? normalInflation(economy) : expectedInflation(economy);
  return monthlyFromAnnual(annual);
}

/** Trailing inflation pulled toward the regime path. Weight 0 is the trailing rate. */
export function expectedInflationFrom(trailing: number, anchor: number, weight: number): number {
  if (weight <= 0) {
    return trailing;
  }
  return weight * anchor + (1 - weight) * trailing;
}

export function expectedInflation(economy: Economy): number {
  return expectedInflationFrom(
    inflation(economy),
    normalInflation(economy),
    economy.params.anchorWeight,
  );
}

/** Annual inflation the regime price path aims for. */
export function normalInflation(economy: Economy): number {
  return economy.params.regime === 'fiat'
    ? economy.params.inflationTarget
    : -economy.params.prodGrowth;
}

export function inflation(economy: Economy): number {
  return yearOverYear(economy.priceHistory, economy.params.inflationTarget);
}

export function growth(economy: Economy): number {
  return yearOverYear(economy.gdpHistory, 0);
}

export function deflationPenalty(economy: Economy): number {
  return deflationPenaltyFrom(economy.params.deflationSensitivity, expectedInflation(economy));
}

export function deflationPenaltyFrom(sensitivity: number, inflationRate: number): number {
  if (sensitivity === 0) {
    return 0;
  }
  return clamp(sensitivity * Math.max(0, -inflationRate), 0, 0.9);
}

export function separate(economy: Economy, household: Household): void {
  const firm = economy.firms[household.employer];
  if (firm) {
    firm.workers = firm.workers.filter((id) => id !== household.id);
  }
  household.employer = -1;
}

export function employ(economy: Economy, count: number): void {
  let hired = 0;
  for (const household of economy.households) {
    if (hired >= count) {
      break;
    }
    const firm = economy.firms[hired % economy.firms.length];
    if (!firm) {
      break;
    }
    firm.workers.push(household.id);
    household.employer = firm.id;
    hired += 1;
  }
}

export function displaced(economy: Economy, household: Household): boolean {
  return economy.aiFactor > 1 && household.skill < economy.automatedShare;
}

export function moneyAmount(economy: Economy, raw: number): number {
  return economy.params.unit === 'cent' ? Math.round(raw) : raw;
}
