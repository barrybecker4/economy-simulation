import { Rng } from '../rng/rng.js';
import { totalDeposits } from './banking.js';
import type { Economy } from './economy.js';
import { employ, priceTrend } from './helpers.js';
import { redistributeToUnemployed } from './income.js';
import { capitalizeBanks } from './bank-books.js';
import { seedOpeningTenure } from './opening-tenure.js';
import type { Parameters } from './parameters.js';
import { NATURAL_UNEMPLOYMENT } from './rules.js';
import {
  blankEconomy,
  normalizeSkills,
  openFirmBooks,
  seedActors,
  seedFirmPayroll,
  seedHouseholdCash,
  seedPriceHistory,
} from './seed.js';
import type { ForcedShock } from './types.js';

export function createEconomy(
  params: Parameters,
  seed: number,
  forcedShock: ForcedShock | null,
): Economy {
  const root = new Rng(seed);
  const economy = blankEconomy(params, root.fork('shocks'), root.fork('population'), forcedShock);
  seedPriceHistory(economy, priceTrend(economy));
  seedActors(economy, root.fork('init'), root);
  normalizeSkills(economy);
  employ(economy, Math.round(params.householdCount * (1 - NATURAL_UNEMPLOYMENT)));
  const initialOutput = openFirmBooks(economy);
  seedHouseholdCash(economy);
  seedFirmPayroll(economy);
  redistributeToUnemployed(economy);
  rememberOpeningIncome(economy, initialOutput);
  seedOpeningTenure(economy);
  capitalizeBanks(economy);
  economy.openingDeposits = totalDeposits(economy);
  return economy;
}

function rememberOpeningIncome(economy: Economy, initialOutput: number): void {
  for (const household of economy.households) {
    household.smoothed = household.income;
  }
  const output = Math.max(initialOutput, 1);
  for (let index = 0; index < economy.gdpHistory.length; index += 1) {
    economy.gdpHistory[index] = output;
  }
}
