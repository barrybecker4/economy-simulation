import type { Economy } from './economy.js';
import { computeProductivitySlope, saturatingCapacityFactor } from './agent-cost.js';
import { humanWeight, referenceWorkersPerFirm } from './helpers.js';
import type { Firm } from './types.js';

export function firmCapacity(economy: Economy, firm: Firm): number {
  const years = economy.tick / 12;
  const slope = computeProductivitySlope(
    economy.params.computeProductivity,
    economy.params.agentCapabilityGrowth,
    years,
  );
  return (
    productionCapacity({
      firmProductivity: firm.productivity,
      productivity: economy.productivity,
      productivityImpulse: economy.productivityImpulse,
      capital: firm.capital,
      alpha: economy.params.alpha,
      labor: firm.workers.length,
      laborStar: referenceWorkersPerFirm(economy),
      aiFactor: economy.aiFactor,
      humanWeight: humanWeight(economy),
      // AI seats only when labor replacement is on, so replacement 0 stays on
      // the prior Phase 17 capacity path (ADR 0029).
      automatedSeats: economy.params.laborReplacement > 0,
    }) * computeCapacityFactor(firm.computeReady, slope, economy.params.agentCapabilityCeiling)
  );
}

/** Cobb–Douglas capacity with AI-scaled staffing. */
export function productionCapacity(input: {
  firmProductivity: number;
  productivity: number;
  productivityImpulse: number;
  capital: number;
  alpha: number;
  labor: number;
  laborStar: number;
  aiFactor: number;
  humanWeight: number;
  /** When true, automation fills seats humans no longer take. */
  automatedSeats?: boolean;
}): number {
  const weight = Math.min(1, Math.max(input.humanWeight, input.automatedSeats ? 0 : 1e-9));
  let staffing: number;
  if (input.automatedSeats) {
    // Automation fills the seats humans no longer take, so a firm can run with
    // zero human workers once humanWeight has fallen.
    const effectiveLabor = input.labor + input.laborStar * (1 - weight);
    const laborHat = Math.max(1e-9, input.laborStar);
    staffing = staffingFactor(effectiveLabor, laborHat, input.alpha, weight);
  } else {
    const laborHat = Math.max(1e-9, input.laborStar * weight);
    staffing = staffingFactor(input.labor, laborHat, input.alpha, weight);
  }
  if (input.capital <= 0) {
    return 0;
  }
  return (
    input.firmProductivity *
    input.productivity *
    (1 + input.productivityImpulse) *
    input.capital ** input.alpha *
    input.laborStar ** (1 - input.alpha) *
    input.aiFactor *
    staffing
  );
}

/**
 * Capacity multiplier from compute bought last month.
 * With a positive finite ceiling, gains saturate at 1 + ceiling.
 * An explicit non-positive ceiling disables the boost (factor 1).
 * Omitted ceiling means unbounded linear: 1 + slope × units.
 */
export function computeCapacityFactor(
  units: number,
  productivity: number,
  ceiling?: number,
): number {
  if (productivity <= 0 || units <= 0) {
    return 1;
  }
  if (ceiling !== undefined) {
    if (!(ceiling > 0) || !Number.isFinite(ceiling)) {
      return 1;
    }
    return saturatingCapacityFactor(units, productivity, ceiling);
  }
  return 1 + productivity * units;
}

function staffingFactor(
  effectiveLabor: number,
  laborHat: number,
  alpha: number,
  weight: number,
): number {
  if (effectiveLabor <= 0) {
    return 0;
  }
  return (effectiveLabor / laborHat) ** ((1 - alpha) * weight);
}
