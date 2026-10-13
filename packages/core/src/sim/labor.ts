import { firmCapacity } from './capacity.js';
import {
  MAX_MONTHLY_PRICE_MOVE,
  MONTHLY_FIRM_SHED,
  MONTHLY_SEPARATION,
  NATURAL_UNEMPLOYMENT,
  SALES_SMOOTHING,
  TIGHTNESS_WAGE,
} from './rules.js';
import { clamp } from './stats.js';
import type { Economy } from './economy.js';
import type { Firm, Household } from './types.js';
import {
  displaced,
  employedCount,
  expectedInflation,
  humanWeight,
  inflation,
  outputGap,
  separate,
  unemploymentRate,
} from './helpers.js';

/** Money wage both sides would sign this month. Uses trend productivity and tightness. */
export function agreedWage(input: {
  priceLevel: number;
  markup: number;
  productivity: number;
  tightness: number;
}): number {
  return (
    input.priceLevel *
    (1 / (1 + input.markup)) *
    input.productivity *
    (1 + TIGHTNESS_WAGE * input.tightness)
  );
}

/**
 * Real-wage reference for the hiring quota. Matches the agreed real wage at
 * zero tightness, without a productivity impulse, so slack and supply shocks
 * do not amplify each other through the quota.
 */
export function hiringReferenceRealWage(input: { markup: number; productivity: number }): number {
  return (1 / (1 + input.markup)) * input.productivity;
}

/** Monthly wage growth that closes (1 − rigidity) of the gap to the agreed wage. */
export function wageGrowth(input: { posted: number; agreed: number; rigidity: number }): number {
  if (!(input.posted > 0)) {
    return 0;
  }
  const gapShare = (input.agreed / input.posted - 1) * (1 - input.rigidity);
  return clamp(gapShare, -MAX_MONTHLY_PRICE_MOVE, MAX_MONTHLY_PRICE_MOVE);
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

/** Headcount whose capacity matches smoothed sales. Unchanged when sales match capacity. */
export function workersForSales(input: {
  workers: number;
  capacity: number;
  expectedSales: number;
  alpha: number;
  humanWeight: number;
  productivityImpulse?: number;
}): number {
  const capacity = Math.max(input.capacity, 1e-9);
  let sales = input.expectedSales > 0 ? input.expectedSales : capacity;

  // During negative productivity shocks, cap expected sales at capacity to prevent
  // perverse hiring when capacity falls but sales expectations haven't adjusted yet
  if (input.productivityImpulse !== undefined && input.productivityImpulse < 0) {
    sales = Math.min(sales, capacity);
  }

  if (input.workers <= 0) {
    return sales > 0 ? 1 : 0;
  }
  const beta = Math.max(0.05, (1 - input.alpha) * Math.min(1, Math.max(input.humanWeight, 1e-9)));
  const ratio = clamp(sales / capacity, 0, 1.5);
  return Math.max(0, Math.round(input.workers * ratio ** (1 / beta)));
}

export function onLabor(economy: Economy): void {
  refreshExpectedSales(economy);
  separateAtRandom(economy);
  const costQuota = employmentTarget(economy);
  const firmTargets = economy.params.firmLevelHiring === 'on' ? firmHeadcounts(economy) : null;
  // Sales can pull the aggregate about one month's shed below the cost quota,
  // and cannot raise it above that quota. That keeps firm-level hiring live
  // without letting a sales drop shed the whole labor force.
  const target = firmTargets
    ? clamp(
        firmTargets.reduce((sum, row) => sum + row.wanted, 0),
        Math.floor(costQuota * (1 - MONTHLY_FIRM_SHED)),
        costQuota,
      )
    : costQuota;
  if (firmTargets) {
    shedFromOverstaffed(economy, target, firmTargets);
    hireToUnderstaffed(economy, target, firmTargets);
  } else {
    shedGradually(economy, target);
    hireUpTo(economy, target, vacancyLimit(economy, target));
  }
  updateWages(economy);
}

function refreshExpectedSales(economy: Economy): void {
  if (economy.tick === 0) {
    return;
  }
  // Unmet demand is nominal. Spread it across firms as units at the CPI so a
  // stockout does not look like a sales collapse for firm-level hiring.
  // Scale the unmet demand contribution based on demand impulse to prevent
  // post-slump overshooting while maintaining normal-time staffing.
  let unmetScale = 1.0;
  if (economy.demandImpulse < -0.01) {
    // During demand contractions, don't add unmet demand (there is none)
    unmetScale = 0;
  } else if (economy.demandImpulse > 0.01 && economy.demandImpulse < 0.05) {
    // During mild recovery (small positive impulse), dampen to prevent overshoot
    unmetScale = 0.3;
  }
  // Otherwise use full unmet demand (normal times and strong booms)

  const unmetUnits =
    unmetScale > 0 && economy.firms.length > 0 && economy.priceLevel > 0
      ? (economy.unmetGoodsDemand / (economy.priceLevel * economy.firms.length)) * unmetScale
      : 0;
  for (const firm of economy.firms) {
    const observed = firm.sales + unmetUnits;
    firm.expectedSales = SALES_SMOOTHING * firm.expectedSales + (1 - SALES_SMOOTHING) * observed;
    firm.sales = 0;
  }
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

export function employmentTarget(economy: Economy): number {
  const scale = wageHiringScale(economy);
  const demand = clamp(1 + economy.demandImpulse + economy.fiscalBoost, 0.85, 1.1);
  return Math.round(
    economy.households.length * (1 - NATURAL_UNEMPLOYMENT) * humanWeight(economy) * demand * scale,
  );
}

function vacancyLimit(economy: Economy, target: number): number {
  return Math.max(1, Math.ceil(Math.max(target, 1) / economy.firms.length));
}

function firmHeadcounts(economy: Economy): { firm: Firm; wanted: number }[] {
  const scale = wageHiringScale(economy);
  return economy.firms.map((firm) => {
    const wanted = Math.round(
      workersForSales({
        workers: firm.workers.length,
        capacity: firmCapacity(economy, firm),
        expectedSales: firm.expectedSales,
        alpha: economy.params.alpha,
        humanWeight: humanWeight(economy),
        productivityImpulse: economy.productivityImpulse,
      }) * scale,
    );
    return { firm, wanted };
  });
}

function agreedWageLevel(economy: Economy): number {
  return agreedWage({
    priceLevel: economy.priceLevel,
    markup: economy.params.markup,
    productivity: economy.productivity,
    tightness: outputGap(economy),
  });
}

function wageHiringScale(economy: Economy): number {
  const realWage = economy.priceLevel > 0 ? economy.wageLevel / economy.priceLevel : 1;
  const scale = hiringScale({
    realWage,
    referenceRealWage: hiringReferenceRealWage({
      markup: economy.params.markup,
      productivity: economy.productivity,
    }),
    elasticity: economy.params.wageElasticity,
  });
  // A negative productivity impulse raises prices. Sticky wages then look cheap
  // against an unchanged reference. Cap the scale at 1 so the shock cuts
  // capacity without a hiring boom. Ordinary fiat inflation overshoot does not
  // use this cap; wage catch-up damping handles the spiral there.
  if (economy.productivityImpulse < 0) {
    return Math.min(scale, 1);
  }
  return scale;
}

function shedGradually(economy: Economy, target: number): void {
  let employed = employedCount(economy);
  const cap = Math.max(1, Math.floor(employed * MONTHLY_FIRM_SHED));
  let shed = 0;
  for (const household of economy.households) {
    if (employed <= target || shed >= cap) {
      break;
    }
    if (household.employer < 0) {
      continue;
    }
    separate(economy, household);
    employed -= 1;
    shed += 1;
  }
}

/** Shed first from firms whose headcount exceeds their sales target. */
function shedFromOverstaffed(
  economy: Economy,
  target: number,
  firmTargets: readonly { firm: Firm; wanted: number }[],
): void {
  let employed = employedCount(economy);
  const cap = Math.max(1, Math.floor(employed * MONTHLY_FIRM_SHED));
  let shed = 0;
  const over = firmTargets
    .filter((row) => row.firm.workers.length > row.wanted)
    .sort(
      (left, right) =>
        right.firm.workers.length - right.wanted - (left.firm.workers.length - left.wanted) ||
        left.firm.id - right.firm.id,
    );
  for (const row of over) {
    while (employed > target && shed < cap && row.firm.workers.length > row.wanted) {
      const workerId = row.firm.workers[row.firm.workers.length - 1];
      const household = workerId === undefined ? undefined : economy.households[workerId];
      if (!household) {
        break;
      }
      separate(economy, household);
      employed -= 1;
      shed += 1;
    }
  }
  if (employed > target && shed < cap) {
    shedGradually(economy, target);
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

/** Hire first into firms whose sales target exceeds current headcount. */
function hireToUnderstaffed(
  economy: Economy,
  target: number,
  firmTargets: readonly { firm: Firm; wanted: number }[],
): void {
  let employed = employedCount(economy);
  const under = new Map(firmTargets.map((row) => [row.firm.id, row.wanted]));
  for (const household of economy.households) {
    if (employed >= target || household.employer >= 0) {
      continue;
    }
    if (placeAtUnderstaffed(economy, household, under)) {
      employed += 1;
    }
  }
  // The aggregate floor can sit above sum(wanted). Fill the remainder on the
  // ordinary vacancy path so employment actually reaches that floor.
  if (employed < target) {
    hireUpTo(economy, target, vacancyLimit(economy, target));
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
    // Set new hire's nominal wage to the market wage
    household.nominalWage = firm.wage * household.skill;
    return true;
  }
  return false;
}

function placeAtUnderstaffed(
  economy: Economy,
  household: Household,
  wantedByFirm: ReadonlyMap<number, number>,
): boolean {
  const start = household.search.uniformInt(0, economy.firms.length - 1);
  const applications = displaced(economy, household) ? 1 : economy.params.maxApplications;
  for (let attempt = 0; attempt < applications; attempt += 1) {
    const firm = economy.firms[(start + attempt) % economy.firms.length];
    if (!firm) {
      continue;
    }
    const wanted = wantedByFirm.get(firm.id) ?? firm.workers.length;
    if (firm.workers.length >= wanted) {
      continue;
    }
    firm.workers.push(household.id);
    household.employer = firm.id;
    // Set new hire's nominal wage to the market wage
    household.nominalWage = firm.wage * household.skill;
    return true;
  }
  return false;
}

/** Soften upward wage catch-up under fiat inflation overshoot; never freeze. */
export function fiatWageCatchUpScale(overshoot: number, inflationTarget: number): number {
  if (!(overshoot > 0)) {
    return 1;
  }
  return clamp(1 - (0.5 * overshoot) / Math.max(inflationTarget, 0.01), 0.5, 1);
}

/**
 * Months of sustained pressure before a firm cuts incumbent nominal wages.
 * Reflects real-world downward nominal wage rigidity: most firms avoid cutting
 * base pay except in extreme, sustained crises.
 */
const WAGE_CUT_PRESSURE_THRESHOLD = 24;

/**
 * Check if conditions justify incrementing wage-cut pressure for a firm.
 * Returns true only in severe crisis conditions that would justify nominal wage cuts
 * in the real world (e.g., 1929-33 Great Depression, 2008-09 financial crisis).
 * 
 * This implements strong downward nominal wage rigidity observed empirically.
 */
function hasWageCutPressure(economy: Economy, firm: Firm): boolean {
  // Deep deflation: expected inflation below -5% (extreme crisis territory)
  const expectedInflationAnnual = expectedInflation(economy);
  const extremeDeflation = expectedInflationAnnual < -0.05;
  
  // Firm in severe distress: negative equity
  const firmLosses = firm.deposit + firm.capital * firm.price - firm.loan < 0;
  
  // Depression-level unemployment: above 15%
  const depressionUnemployment = unemploymentRate(economy) > 0.15;
  
  // Only cut wages in truly extreme circumstances:
  // Need BOTH extreme deflation and either firm losses or depression unemployment
  return extremeDeflation && (firmLosses || depressionUnemployment);
}

function updateWages(economy: Economy): void {
  // Calculate the market wage (what new hires would get)
  const marketWage = agreedWageLevel(economy);
  
  // Calculate upward growth for the economy-wide reference
  let growth = wageGrowth({
    posted: economy.wageLevel,
    agreed: marketWage,
    rigidity: economy.params.rigidity,
  });
  
  // Under fiat, damp upward catch-up once trailing inflation is already above
  // target so wages and prices do not chase each other into a money spiral.
  if (economy.params.regime === 'fiat' && growth > 0) {
    growth *= fiatWageCatchUpScale(
      inflation(economy) - economy.params.inflationTarget,
      economy.params.inflationTarget,
    );
  }
  
  // Update economy-wide reference wage (for new hires)
  economy.wageLevel *= 1 + growth;
  
  // Update each firm's wages with downward nominal rigidity
  for (const firm of economy.firms) {
    updateFirmWages(economy, firm, growth);
  }
}

/**
 * Update wages at a specific firm with downward nominal rigidity.
 * Both incumbent and new-hire wages resist downward adjustment.
 */
function updateFirmWages(economy: Economy, firm: Firm, referenceGrowth: number): void {
  // Market wage for this firm (what the market would clear at)
  const marketWage = economy.wageLevel * firm.productivity;
  
  // Track pressure conditions
  if (hasWageCutPressure(economy, firm)) {
    firm.wageCutPressure += 1;
  } else {
    firm.wageCutPressure = 0;
  }
  
  // Decide if we can cut wages
  const canCutWages = firm.wageCutPressure >= WAGE_CUT_PRESSURE_THRESHOLD;
  
  // Calculate average incumbent wage at this firm for new hire reference
  let incumbentWageSum = 0;
  let incumbentCount = 0;
  for (const workerId of firm.workers) {
    const worker = economy.households[workerId];
    if (worker && worker.nominalWage > 0) {
      incumbentWageSum += worker.nominalWage / worker.skill; // Base wage
      incumbentCount += 1;
    }
  }
  
  // New hires get the higher of: market wage or average incumbent wage
  // This implements "internal equity" - new hires shouldn't be paid dramatically
  // less than existing workers doing the same job, which would cause morale issues
  const avgIncumbentBase = incumbentCount > 0 ? incumbentWageSum / incumbentCount : marketWage;
  const newHireBase = canCutWages ? marketWage : Math.max(marketWage, avgIncumbentBase);
  
  // For incumbent workers, apply rigidity to downward moves
  for (const workerId of firm.workers) {
    const worker = economy.households[workerId];
    if (!worker) {
      continue;
    }
    
    // If worker has no wage set (legacy), set to the new hire base
    if (worker.nominalWage <= 0) {
      worker.nominalWage = newHireBase * worker.skill;
      continue;
    }
    
    // Target wage for this worker
    const targetWage = marketWage * worker.skill;
    
    // Always allow upward adjustments
    if (targetWage > worker.nominalWage) {
      // Apply the same catch-up scaling as the economy reference
      const growth = (targetWage / worker.nominalWage - 1) * (1 - economy.params.rigidity);
      const scaledGrowth = economy.params.regime === 'fiat' && growth > 0
        ? growth * fiatWageCatchUpScale(
            inflation(economy) - economy.params.inflationTarget,
            economy.params.inflationTarget,
          )
        : growth;
      worker.nominalWage *= 1 + clamp(scaledGrowth, -MAX_MONTHLY_PRICE_MOVE, MAX_MONTHLY_PRICE_MOVE);
    } else if (targetWage < worker.nominalWage && canCutWages) {
      // Only allow downward adjustments after sustained pressure
      // Still apply rigidity to make cuts gradual
      const growth = (targetWage / worker.nominalWage - 1) * (1 - economy.params.rigidity);
      worker.nominalWage *= 1 + clamp(growth, -MAX_MONTHLY_PRICE_MOVE, MAX_MONTHLY_PRICE_MOVE);
    }
    // else: hold wage constant (downward nominal rigidity without threshold met)
  }
  
  // Set firm's wage to the new hire base (for new hires and reference)
  firm.wage = newHireBase;
}
