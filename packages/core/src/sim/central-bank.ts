import { splitProportional } from './allocate.js';
import { equityFor, loansAt, savingsStock, totalDeposits, totalLoans } from './banking.js';
import type { Economy } from './economy.js';
import { expectedInflation, inflation, moneyAmount, outputGap } from './helpers.js';
import { updateMoneyChoice } from './monies.js';
import {
  addReserves,
  creditDeposit,
  creditFirms,
  debitDeposit,
  injectBankCapital,
  payDepositInterest as creditDepositInterest,
} from './money.js';
import { DEPOSIT_BUFFER_MONTHS, LOAN_SPREAD, THIN_OPENING_MONTHS } from './rules.js';
import { clamp } from './stats.js';

/** Taylor-style fiat policy rate. */
export function taylorRate(input: {
  timePrefMean: number;
  inflation: number;
  inflationTarget: number;
  inflationWeight: number;
  outputWeight: number;
  outputGap: number;
}): number {
  return Math.max(
    0,
    input.timePrefMean +
      input.inflation +
      input.inflationWeight * (input.inflation - input.inflationTarget) +
      input.outputWeight * input.outputGap,
  );
}

/** Bitcoin/hybrid loan rate as a level around time preference, not a ratchet to zero. */
export function marketLoanRate(input: {
  timePrefMean: number;
  loans: number;
  savings: number;
}): number {
  const pressure = input.savings > 0 ? clamp(input.loans / input.savings - 1, -1, 2) : 0;
  return Math.max(0, input.timePrefMean + LOAN_SPREAD * pressure);
}

export function onCentralBank(economy: Economy): void {
  updateMoneyChoice(economy);
  if (economy.params.choiceSpeed > 0) {
    setBlendedPolicy(economy);
    if (economy.moneyShares.fiat > 0) {
      accommodateReserves(economy);
    }
  } else if (economy.params.regime === 'fiat') {
    setFiatPolicy(economy);
    growFiatMoney(economy);
    accommodateReserves(economy);
  } else {
    setMarketRate(economy);
    if (economy.params.regime === 'hybrid') {
      supportInsolventBanks(economy);
    }
  }
}

/**
 * Grow or shrink fiat broad money toward the inflation target plus productivity.
 * Credits household deposits and matching bank reserves so books stay closed.
 */
export function growFiatMoney(economy: Economy): void {
  if (economy.params.regime !== 'fiat' || economy.params.moneyGrowth <= 0) {
    return;
  }
  const trailing = inflation(economy);
  const annual =
    economy.params.inflationTarget +
    economy.params.prodGrowth +
    (economy.params.inflationTarget - trailing);
  const monthly = (economy.params.moneyGrowth * annual) / 12;
  const deposits = totalDeposits(economy);
  if (deposits <= 0) {
    return;
  }
  const raw = deposits * monthly;
  const capped = clamp(raw, -0.05 * deposits, 0.05 * deposits);
  const amount = moneyAmount(economy, capped);
  if (amount === 0) {
    return;
  }
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Fiat money growth needs a bank');
  }
  if (amount > 0) {
    injectHouseholdDeposits(economy, amount);
    addReserves(bank, amount);
    return;
  }
  const removed = drainHouseholdDeposits(economy, -amount);
  if (removed > 0) {
    bank.reserves = Math.max(0, bank.reserves - removed);
  }
}

function injectHouseholdDeposits(economy: Economy, amount: number): void {
  if (economy.households.length === 0 || amount <= 0) {
    return;
  }
  const weights = economy.households.map((household) => Math.max(0, household.deposit));
  const parts = splitProportional(amount, weights);
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    const share = parts[index] ?? 0;
    if (household && share > 0) {
      creditDeposit(household, share);
      blendIdleMoney(economy, household, share);
    }
  }
}

function drainHouseholdDeposits(economy: Economy, amount: number): number {
  if (economy.households.length === 0 || amount <= 0) {
    return 0;
  }
  const weights = economy.households.map((household) => Math.max(0, household.deposit));
  const parts = splitProportional(amount, weights);
  let removed = 0;
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    const share = parts[index] ?? 0;
    if (!household || share <= 0) {
      continue;
    }
    const take = Math.min(household.deposit, share);
    if (take > 0) {
      debitDeposit(household, take);
      removed += take;
    }
  }
  return removed;
}

/**
 * When posted prices follow excess demand, balances under the precautionary
 * buffer would otherwise hoard broad-money growth. Blend new money into
 * smoothed income in proportion to that shortfall so it is shopped with.
 * At trend weight 1 the regime price path already carries the money rule,
 * and at the buffer the wealth rule already spends the surplus.
 */
function blendIdleMoney(
  economy: Economy,
  household: { deposit: number; income: number; smoothed: number },
  flow: number,
): void {
  if (
    economy.params.trendWeight >= 1 ||
    economy.params.openingDepositMonths >= THIN_OPENING_MONTHS ||
    flow <= 0 ||
    household.income <= 0
  ) {
    return;
  }
  const buffer = household.income * DEPOSIT_BUFFER_MONTHS;
  const shortfall = clamp((buffer - household.deposit) / buffer, 0, 1);
  household.smoothed = Math.max(0, household.smoothed + flow * shortfall);
}

function setBlendedPolicy(economy: Economy): void {
  const taylor = taylorRate({
    timePrefMean: economy.params.timePrefMean,
    inflation: expectedInflation(economy),
    inflationTarget: economy.params.inflationTarget,
    inflationWeight: economy.params.inflationWeight,
    outputWeight: economy.params.outputWeight,
    outputGap: outputGap(economy),
  });
  const market = marketLoanRate({
    timePrefMean: economy.params.timePrefMean,
    loans: totalLoans(economy),
    savings: savingsStock(economy),
  });
  const fiat = economy.moneyShares.fiat;
  economy.policyRate = Math.max(0, fiat * taylor + (1 - fiat) * market);
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
}

function setMarketRate(economy: Economy): void {
  economy.policyRate = marketLoanRate({
    timePrefMean: economy.params.timePrefMean,
    loans: totalLoans(economy),
    savings: savingsStock(economy),
  });
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
}

function supportInsolventBanks(economy: Economy): void {
  for (const bank of economy.banks) {
    if (bank.equity < 0) {
      injectBankCapital(bank, economy, -bank.equity + 1);
    }
  }
}

function setFiatPolicy(economy: Economy): void {
  economy.policyRate = taylorRate({
    timePrefMean: economy.params.timePrefMean,
    inflation: expectedInflation(economy),
    inflationTarget: economy.params.inflationTarget,
    inflationWeight: economy.params.inflationWeight,
    outputWeight: economy.params.outputWeight,
    outputGap: outputGap(economy),
  });
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
}

function accommodateReserves(economy: Economy): void {
  const required = Math.round(economy.params.reserveRequirement * totalDeposits(economy));
  const reserves = economy.banks.reduce((sum, bank) => sum + bank.reserves, 0);
  if (reserves >= required) {
    return;
  }
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Reserve accommodation needs a bank');
  }
  const gap = required - reserves;
  addReserves(bank, gap);
  creditFirms(economy, gap);
}

/**
 * Pay the posted deposit rate from bank equity, after borrower interest and
 * before dividends. Funding is borrower interest booked this tick plus equity
 * above the regulatory target. Records the annualized rate actually paid.
 */
export function payHouseholdDepositInterest(
  economy: Economy,
  borrowerInterestByBank: ReadonlyMap<number, number>,
): void {
  economy.depositInterestPaid = 0;
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
  if (economy.depositRate <= 0) {
    economy.paidDepositRate = 0;
    return;
  }
  const monthly = economy.depositRate / 12;
  const roomByBank = new Map<number, number>();
  for (const bank of economy.banks) {
    const target = equityFor(economy, loansAt(economy, bank.id));
    const fromBorrowers = borrowerInterestByBank.get(bank.id) ?? 0;
    const equityBeforeInterest = bank.equity - fromBorrowers;
    const surplus = Math.max(0, equityBeforeInterest - target);
    roomByBank.set(bank.id, surplus + fromBorrowers);
  }
  for (const household of economy.households) {
    const bank = economy.banks[household.bank];
    if (!bank || bank.failed || household.deposit <= 0) {
      continue;
    }
    const room = roomByBank.get(bank.id) ?? 0;
    if (room <= 0) {
      continue;
    }
    const wanted = moneyAmount(economy, household.deposit * monthly);
    const interest = Math.min(wanted, room);
    if (interest <= 0) {
      continue;
    }
    creditDepositInterest(bank, household, economy, interest);
    economy.depositInterestPaid += interest;
    roomByBank.set(bank.id, room - interest);
  }
  const deposits = Math.max(1, totalDeposits(economy) - economy.depositInterestPaid);
  economy.paidDepositRate = deposits > 0 ? (economy.depositInterestPaid * 12) / deposits : 0;
}
