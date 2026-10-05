import { NATURAL_UNEMPLOYMENT } from './rules.js';
import { clamp, monthlyFromAnnual } from './stats.js';
import { yearOverYear } from './yoy.js';
import type { Economy } from './economy.js';
import type { Firm, Household } from './types.js';

export function humanWeight(economy: Economy): number {
  return 1 / Math.max(economy.aiFactor, 1);
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

export function pay(household: Household, firm: Firm): number {
  return Math.max(1, Math.round(firm.wage * household.skill));
}

export function firmCapacity(economy: Economy, firm: Firm): number {
  return productionCapacity({
    firmProductivity: firm.productivity,
    productivity: economy.productivity,
    productivityImpulse: economy.productivityImpulse,
    capital: firm.capital,
    alpha: economy.params.alpha,
    labor: firm.workers.length,
    laborStar: referenceWorkersPerFirm(economy),
    aiFactor: economy.aiFactor,
  });
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
}): number {
  const weight = 1 / Math.max(input.aiFactor, 1);
  const laborHat = Math.max(1e-9, input.laborStar * weight);
  const staffing = input.labor <= 0 ? 0 : (input.labor / laborHat) ** ((1 - input.alpha) * weight);
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

export function totalDeposits(economy: Economy): number {
  let total = economy.govDeposits;
  for (const household of economy.households) {
    total += household.deposit;
  }
  for (const firm of economy.firms) {
    total += firm.deposit;
  }
  for (const agent of economy.agents) {
    total += agent.deposit;
  }
  return total;
}

export function totalLoans(economy: Economy): number {
  let total = 0;
  for (const firm of economy.firms) {
    total += firm.loan;
  }
  for (const household of economy.households) {
    total += household.mortgage + household.consumerLoan;
  }
  return total;
}

export function loansAt(economy: Economy, bankId: number): number {
  let total = 0;
  for (const firm of economy.firms) {
    if (firm.bank === bankId) {
      total += firm.loan;
    }
  }
  for (const household of economy.households) {
    if (household.bank === bankId) {
      total += household.mortgage + household.consumerLoan;
    }
  }
  return total;
}

export function equityFor(economy: Economy, loans: number): number {
  const ratio = economy.params.capitalRatio / Math.max(0.01, 1 - economy.params.capitalRatio);
  return Math.max(1, Math.round(1.5 * ratio * Math.max(loans, 1)));
}

export function lendingRoom(economy: Economy, bankId: number, bankEquity: number): number {
  const loans = loansAt(economy, bankId);
  const cap = bankEquity / Math.max(economy.params.capitalRatio, 0.01);
  return Math.max(0, cap - loans) * (1 + Math.max(0, economy.creditImpulse));
}

export function savingsStock(economy: Economy): number {
  const fraction = economy.params.lendingModel === 'fullReserve' ? 0.1 : 0.25;
  let total = 0;
  for (const household of economy.households) {
    total += Math.max(0, household.deposit) * fraction;
  }
  return total;
}

export function savingsRoom(economy: Economy): number {
  return Math.max(0, savingsStock(economy) - totalLoans(economy));
}

export function priceTrend(economy: Economy): number {
  return monthlyFromAnnual(normalInflation(economy));
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
  return deflationPenaltyFrom(economy.params.deflationSensitivity, inflation(economy));
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
