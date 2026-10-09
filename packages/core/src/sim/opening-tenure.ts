import { splitProportional } from './allocate.js';
import { monthlyMortgagePayment } from './contracts.js';
import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { setMortgage } from './money.js';
import { housingPriceFactors } from './housing.js';
import { LOAN_SPREAD } from './rules.js';
import type { Household } from './types.js';

/** Household counts for an opening owner share and a mortgage share of those owners. */
export function openingTenureQuotas(
  count: number,
  ownerShare: number,
  mortgageAmongOwners: number,
): { owned: number; mortgage: number; rent: number } {
  const owners = Math.round(count * clampShare(ownerShare));
  const mortgage = Math.min(owners, Math.round(owners * clampShare(mortgageAmongOwners)));
  return { owned: owners - mortgage, mortgage, rent: count - owners };
}

/**
 * When tenure choice is on, households open already housed. The purchase is
 * not replayed. An opening mortgage is outstanding principal, scaled so bank
 * reserves still cover the reserve requirement.
 */
export function seedOpeningTenure(economy: Economy): void {
  if (economy.params.tenureChoice !== 'on' || economy.households.length === 0) {
    return;
  }
  const quotas = openingTenureQuotas(
    economy.households.length,
    economy.params.openingOwnerShare,
    economy.params.openingMortgageAmongOwners,
  );
  const ranked = [...economy.households].sort((a, b) => b.skill - a.skill || a.id - b.id);
  const loanRate = economy.policyRate + LOAN_SPREAD;
  const mortgagors: Household[] = [];
  const wanted: number[] = [];
  for (let index = 0; index < ranked.length; index += 1) {
    const household = ranked[index];
    if (!household) {
      continue;
    }
    clearHousingDebt(household);
    if (index < quotas.owned) {
      household.tenure = 'owned';
    } else if (index < quotas.owned + quotas.mortgage) {
      household.tenure = 'mortgage';
      mortgagors.push(household);
      wanted.push(openingPrincipal(economy, household));
    } else {
      household.tenure = 'rent';
    }
  }
  const principals = principalsWithinReserves(economy, mortgagors, wanted);
  for (let index = 0; index < mortgagors.length; index += 1) {
    const household = mortgagors[index];
    const principal = principals[index] ?? 0;
    if (!household) {
      continue;
    }
    if (principal <= 0) {
      household.tenure = 'owned';
      continue;
    }
    setMortgage(household, principal);
    household.mortgagePayment = openingPayment(economy, principal, loanRate);
  }
}

function openingPrincipal(economy: Economy, household: Household): number {
  const income = Math.max(household.income, household.smoothed, 1);
  return income * housingPriceFactors(economy).months * economy.params.mortgageLtv;
}

function openingPayment(economy: Economy, principal: number, loanRate: number): number {
  const payment = moneyAmount(
    economy,
    monthlyMortgagePayment(principal, loanRate, economy.params.mortgageTermYears),
  );
  if (payment > 0) {
    return payment;
  }
  return economy.params.unit === 'cent' ? 1 : principal;
}

/**
 * Cap each bank's book on its own. Reserves are filled per bank, so a global
 * cap can still leave one bank with more loans than deposits.
 */
function principalsWithinReserves(
  economy: Economy,
  mortgagors: readonly Household[],
  wanted: readonly number[],
): number[] {
  const principals = wanted.map(() => 0);
  const indexesByBank = new Map<number, number[]>();
  for (let index = 0; index < mortgagors.length; index += 1) {
    const household = mortgagors[index];
    if (!household) {
      continue;
    }
    const indexes = indexesByBank.get(household.bank) ?? [];
    indexes.push(index);
    indexesByBank.set(household.bank, indexes);
  }
  for (const [bankId, indexes] of indexesByBank) {
    const fitted = fitBankBook(
      economy,
      bankId,
      indexes.map((index) => wanted[index] ?? 0),
    );
    for (let position = 0; position < indexes.length; position += 1) {
      const index = indexes[position];
      if (index !== undefined) {
        principals[index] = fitted[position] ?? 0;
      }
    }
  }
  return principals;
}

function fitBankBook(economy: Economy, bankId: number, wanted: readonly number[]): number[] {
  const deposits = depositsAt(economy, bankId);
  const reserve = moneyAmount(economy, deposits * economy.params.reserveRequirement);
  const room = Math.max(0, deposits - firmLoansAt(economy, bankId) - reserve);
  const unscaled = wanted.map((value) => moneyAmount(economy, Math.max(0, value)));
  const sum = unscaled.reduce((total, value) => total + value, 0);
  if (sum <= room) {
    return unscaled;
  }
  if (!(room > 0)) {
    return wanted.map(() => 0);
  }
  return splitProportional(room, wanted);
}

function depositsAt(economy: Economy, bankId: number): number {
  let total = bankId === 0 ? economy.govDeposits : 0;
  for (const household of economy.households) {
    if (household.bank === bankId) {
      total += household.deposit;
    }
  }
  for (const firm of economy.firms) {
    if (firm.bank === bankId) {
      total += firm.deposit;
    }
  }
  for (const agent of economy.agents) {
    const owner = economy.households[agent.owner];
    if (owner && owner.bank === bankId) {
      total += agent.deposit;
    }
  }
  return total;
}

function firmLoansAt(economy: Economy, bankId: number): number {
  return economy.firms.reduce((total, firm) => total + (firm.bank === bankId ? firm.loan : 0), 0);
}

function clearHousingDebt(household: Household): void {
  setMortgage(household, 0);
  household.mortgagePayment = 0;
  household.mortgageArrears = 0;
}

function clampShare(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}
