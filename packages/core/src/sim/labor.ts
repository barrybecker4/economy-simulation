import {
  MAX_MONTHLY_PRICE_MOVE,
  MONTHLY_SEPARATION,
  NATURAL_UNEMPLOYMENT,
  TIGHTNESS_WAGE,
} from './rules.js';
import { clamp, monthlyFromAnnual } from './stats.js';
import type { Economy } from './economy.js';
import {
  displaced,
  employedCount,
  humanWeight,
  naturalUnemployment,
  priceTrend,
  separate,
} from './helpers.js';

/** Monthly wage growth from trend, tightness, and nominal rigidity. */
export function wageGrowth(input: { trend: number; tightness: number; rigidity: number }): number {
  const gap = TIGHTNESS_WAGE * input.tightness;
  const stickyGap = gap < 0 ? (1 - input.rigidity) ** 2 * gap : (1 - input.rigidity) * gap;
  return clamp(input.trend + stickyGap, -MAX_MONTHLY_PRICE_MOVE, MAX_MONTHLY_PRICE_MOVE);
}

export function onLabor(economy: Economy): void {
  for (const household of economy.households) {
    if (household.employer < 0) {
      continue;
    }
    if (household.search.uniform() < MONTHLY_SEPARATION) {
      separate(economy, household);
    }
  }
  const weight = humanWeight(economy);
  const target = Math.round(
    economy.households.length *
      (1 - NATURAL_UNEMPLOYMENT) *
      weight *
      clamp(1 + economy.demandImpulse, 0.85, 1.1),
  );
  const perFirm = Math.max(1, Math.ceil(Math.max(target, 1) / economy.firms.length));
  let employed = employedCount(economy);
  for (const household of economy.households) {
    if (employed >= target) {
      break;
    }
    if (household.employer >= 0) {
      continue;
    }
    const start = household.search.uniformInt(0, economy.firms.length - 1);
    const applications = displaced(economy, household) ? 1 : economy.params.maxApplications;
    for (let attempt = 0; attempt < applications; attempt += 1) {
      const firm = economy.firms[(start + attempt) % economy.firms.length];
      if (!firm || firm.workers.length >= perFirm) {
        continue;
      }
      firm.workers.push(household.id);
      household.employer = firm.id;
      employed += 1;
      break;
    }
  }
  const unemployment = 1 - employedCount(economy) / economy.households.length;
  const natural = naturalUnemployment(economy);
  const tightness = (natural - unemployment) * weight;
  const trend = priceTrend(economy) + monthlyFromAnnual(economy.params.prodGrowth);
  economy.wageLevel *= 1 + wageGrowth({ trend, tightness, rigidity: economy.params.rigidity });
  for (const firm of economy.firms) {
    firm.wage = economy.wageLevel * firm.productivity;
  }
}
