import {
  MAX_MONTHLY_PRICE_MOVE,
  MONTHLY_SEPARATION,
  NATURAL_UNEMPLOYMENT,
  TIGHTNESS_WAGE,
} from './rules.js';
import { clamp, monthlyFromAnnual } from './stats.js';
import type { Economy } from './economy.js';
import type { Household } from './types.js';
import {
  displaced,
  employedCount,
  humanWeight,
  outputGap,
  priceTrend,
  separate,
} from './helpers.js';

/** Monthly wage growth from trend, tightness, and nominal rigidity. */
export function wageGrowth(input: { trend: number; tightness: number; rigidity: number }): number {
  const gap = TIGHTNESS_WAGE * input.tightness;
  const stickyGap = gap < 0 ? (1 - input.rigidity) ** 2 * gap : (1 - input.rigidity) * gap;
  return clamp(input.trend + stickyGap, -MAX_MONTHLY_PRICE_MOVE, MAX_MONTHLY_PRICE_MOVE);
}

/** Scale the hiring quota when the real wage is away from its cost reference. Elasticity 0 leaves it at 1. */
export function hiringScale(input: {
  realWage: number;
  referenceRealWage: number;
  elasticity: number;
}): number {
  if (input.elasticity <= 0 || input.referenceRealWage <= 0) {
    return 1;
  }
  const gap = input.realWage / input.referenceRealWage - 1;
  return clamp(1 - input.elasticity * gap, 0.5, 1.25);
}

export function onLabor(economy: Economy): void {
  separateAtRandom(economy);
  const target = employmentTarget(economy);
  shedDownTo(economy, target);
  hireUpTo(economy, target, vacancyLimit(economy, target));
  updateWages(economy);
}

function separateAtRandom(economy: Economy): void {
  for (const household of economy.households) {
    if (household.employer < 0) {
      continue;
    }
    if (household.search.uniform() < MONTHLY_SEPARATION) {
      separate(economy, household);
    }
  }
}

function employmentTarget(economy: Economy): number {
  const realWage = economy.priceLevel > 0 ? economy.wageLevel / economy.priceLevel : 1;
  const scale = hiringScale({
    realWage,
    referenceRealWage: 1 / (1 + economy.params.markup),
    elasticity: economy.params.wageElasticity,
  });
  const demand = clamp(1 + economy.demandImpulse + economy.fiscalBoost, 0.85, 1.1);
  return Math.round(
    economy.households.length * (1 - NATURAL_UNEMPLOYMENT) * humanWeight(economy) * demand * scale,
  );
}

function vacancyLimit(economy: Economy, target: number): number {
  return Math.max(1, Math.ceil(Math.max(target, 1) / economy.firms.length));
}

function shedDownTo(economy: Economy, target: number): void {
  let employed = employedCount(economy);
  if (employed <= target) {
    return;
  }
  for (const household of economy.households) {
    if (employed <= target) {
      break;
    }
    if (household.employer < 0) {
      continue;
    }
    separate(economy, household);
    employed -= 1;
  }
}

function hireUpTo(economy: Economy, target: number, perFirm: number): void {
  let employed = employedCount(economy);
  for (const household of economy.households) {
    if (employed >= target || household.employer >= 0) {
      continue;
    }
    if (placeHousehold(economy, household, perFirm)) {
      employed += 1;
    }
  }
}

function placeHousehold(economy: Economy, household: Household, perFirm: number): boolean {
  const start = household.search.uniformInt(0, economy.firms.length - 1);
  const applications = displaced(economy, household) ? 1 : economy.params.maxApplications;
  for (let attempt = 0; attempt < applications; attempt += 1) {
    const firm = economy.firms[(start + attempt) % economy.firms.length];
    if (!firm || firm.workers.length >= perFirm) {
      continue;
    }
    firm.workers.push(household.id);
    household.employer = firm.id;
    return true;
  }
  return false;
}

function updateWages(economy: Economy): void {
  const trend = priceTrend(economy) + monthlyFromAnnual(economy.params.prodGrowth);
  const growth = wageGrowth({
    trend,
    tightness: outputGap(economy),
    rigidity: economy.params.rigidity,
  });
  economy.wageLevel *= 1 + growth;
  for (const firm of economy.firms) {
    firm.wage = economy.wageLevel * firm.productivity;
  }
}
