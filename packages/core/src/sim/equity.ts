import { powerWeights, splitProportional } from './allocate.js';
import type { Economy } from './economy.js';
import { PROFIT_SKILL_EXPONENT } from './rules.js';

/** Split firm capital, valued at posted prices, by the profit-share weights. */
export function capitalClaims(input: {
  capitalValue: number;
  skills: readonly number[];
  concentration: number;
}): number[] {
  if (input.capitalValue <= 0 || input.skills.length === 0) {
    return input.skills.map(() => 0);
  }
  return splitProportional(input.capitalValue, powerWeights(input.skills, input.concentration));
}

export function refreshEquityClaims(economy: Economy): void {
  let capitalValue = 0;
  for (const firm of economy.firms) {
    capitalValue += Math.max(0, firm.capital * firm.price);
  }
  const concentration =
    PROFIT_SKILL_EXPONENT +
    (economy.aiFactor > 1 ? economy.params.ownership * (economy.aiFactor - 1) : 0);
  economy.equityClaims = capitalClaims({
    capitalValue,
    skills: economy.households.map((household) => household.skill),
    concentration,
  });
}
