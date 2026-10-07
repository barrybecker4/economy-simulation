import type { Economy } from './economy.js';
import { humanWeight, referenceWorkersPerFirm } from './helpers.js';
import type { Firm } from './types.js';

export function firmCapacity(economy: Economy, firm: Firm): number {
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
    }) * computeCapacityFactor(firm.computeReady, economy.params.computeProductivity)
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
}): number {
  const weight = Math.min(1, Math.max(input.humanWeight, 1e-9));
  const laborHat = Math.max(1e-9, input.laborStar * weight);
  const staffing = staffingFactor(input.labor, laborHat, input.alpha, weight);
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

/** Capacity multiplier from compute bought last month. Zero productivity leaves capacity unchanged. */
export function computeCapacityFactor(units: number, productivity: number): number {
  if (productivity <= 0 || units <= 0) {
    return 1;
  }
  return 1 + productivity * units;
}

function staffingFactor(labor: number, laborHat: number, alpha: number, weight: number): number {
  if (labor <= 0) {
    return 0;
  }
  return (labor / laborHat) ** ((1 - alpha) * weight);
}
