import { splitProportional } from './allocate.js';
import { addBonds, bondNumber, savingsStock, totalDeposits, totalLoans } from './banking.js';
import type { Economy } from './economy.js';
import { expectedInflation, inflation, moneyAmount, outputGap } from './helpers.js';
import { updateMoneyChoice } from './monies.js';
import {
  addReserves,
  creditDeposit,
  creditFirms,
  creditTreasury,
  debitDeposit,
  debitTreasury,
  drawFirmLoan,
  injectBankCapital,
  payFromTreasury,
  repayFirmLoan,
} from './money.js';
import { markLenderOfLastResort } from './resolution.js';
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
 * The injection channel chooses the offsetting stock. A contraction withdraws
 * from that same sector, and only up to the balances that exist.
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
  // Reserve interest and the deposit-interest subsidy were already created this
  // tick inside the growth budget. Net them out so the annual path still holds.
  const amount = moneyAmount(economy, capped) - economy.reserveInterestPaid;
  if (amount === 0) {
    return;
  }
  if (amount > 0) {
    placeInjection(economy, amount);
    return;
  }
  withdrawInjection(economy, -amount);
}

/** Book one positive injection on the economy's channel. */
export function placeInjection(economy: Economy, amount: number): void {
  if (amount <= 0) {
    return;
  }
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Fiat money growth needs a bank');
  }
  const channel = economy.params.injectionChannel;
  if (channel === 'governmentSpending') {
    creditTreasury(economy, amount);
    addReserves(bank, amount);
    spendTreasuryInjection(economy, amount);
    blendChannelReceipts(economy, amount);
    return;
  }
  if (channel === 'newLoans') {
    economy.channelLoans += bookFirmLoans(economy, amount);
    blendChannelReceipts(economy, amount);
    return;
  }
  if (channel === 'assetPurchase') {
    addBonds(bank, amount);
    creditFirms(economy, amount);
    blendChannelReceipts(economy, amount);
    return;
  }
  injectHouseholdDeposits(economy, amount);
  addReserves(bank, amount);
}

/**
 * Withdraw a contraction from the sector the channel credits. Returns the
 * amount actually removed.
 */
export function withdrawInjection(economy: Economy, amount: number): number {
  if (amount <= 0) {
    return 0;
  }
  const channel = economy.params.injectionChannel;
  if (channel === 'newLoans') {
    const removed = repayInjectedLoans(economy, amount);
    economy.channelLoans = Math.max(0, economy.channelLoans - removed);
    return removed;
  }
  if (channel === 'assetPurchase') {
    return unwindPurchasedClaims(economy, amount);
  }
  if (channel === 'governmentSpending') {
    const fromTreasury = Math.min(Math.max(0, economy.govDeposits), amount);
    if (fromTreasury > 0) {
      debitTreasury(economy, fromTreasury);
    }
    const fromFirms = drainFirmDeposits(economy, amount - fromTreasury);
    const removed = fromTreasury + fromFirms;
    releaseReserves(economy, Math.min(removed, reserveStock(economy)));
    return removed;
  }
  const removed = drainHouseholdDeposits(economy, Math.min(amount, reserveStock(economy)));
  releaseReserves(economy, removed);
  return removed;
}

function bookFirmLoans(economy: Economy, amount: number): number {
  const parts = splitProportional(
    amount,
    economy.firms.map(() => 1),
  );
  let booked = 0;
  for (let index = 0; index < economy.firms.length; index += 1) {
    const firm = economy.firms[index];
    const share = parts[index] ?? 0;
    if (firm && share > 0) {
      drawFirmLoan(firm, share);
      booked += share;
    }
  }
  return booked;
}

/** Repay last tick's injection loans before wages, so the cash is not a gift. */
export function repayChannelLoans(economy: Economy): void {
  if (economy.channelLoans <= 0) {
    return;
  }
  const repaid = repayInjectedLoans(economy, economy.channelLoans);
  economy.channelLoans -= repaid;
  economy.loanRepaid += repaid;
}

function repayInjectedLoans(economy: Economy, amount: number): number {
  let left = amount;
  for (const firm of economy.firms) {
    if (left <= 0) {
      break;
    }
    const take = Math.min(Math.max(0, firm.loan), Math.max(0, firm.deposit), left);
    if (take > 0) {
      repayFirmLoan(firm, take);
      left -= take;
    }
  }
  return amount - left;
}

function unwindPurchasedClaims(economy: Economy, amount: number): number {
  let left = amount;
  for (const bank of economy.banks) {
    if (left <= 0) {
      break;
    }
    const available = bondNumber(bank);
    const claim = available <= 0 ? 0 : Math.min(left, available);
    const removed = drainFirmDeposits(economy, claim);
    addBonds(bank, -removed);
    left -= removed;
  }
  return amount - left;
}

/** Spend a fresh treasury credit on firms. Does not spend the balance that was already there. */
function spendTreasuryInjection(economy: Economy, amount: number): void {
  let left = amount;
  const firms = economy.firms;
  if (firms.length === 0) {
    return;
  }
  const each = Math.floor(amount / firms.length);
  for (let index = 0; index < firms.length; index += 1) {
    const firm = firms[index];
    if (!firm || left <= 0) {
      continue;
    }
    const share = index === firms.length - 1 ? left : Math.min(left, each);
    const bill = Math.min(share, Math.max(0, economy.govDeposits));
    if (bill > 0) {
      payFromTreasury(firm, economy, bill);
      economy.govGoodsSpend += bill;
      left -= bill;
    }
  }
}

function drainFirmDeposits(economy: Economy, amount: number): number {
  if (amount <= 0) {
    return 0;
  }
  const weights = economy.firms.map((firm) => Math.max(0, firm.deposit));
  const parts = splitProportional(amount, weights);
  let removed = 0;
  for (let index = 0; index < economy.firms.length; index += 1) {
    const firm = economy.firms[index];
    const share = parts[index] ?? 0;
    if (!firm || share <= 0) {
      continue;
    }
    const take = Math.min(Math.max(0, firm.deposit), share);
    if (take > 0) {
      firm.deposit -= take;
      removed += take;
    }
  }
  return removed;
}

/**
 * Blend receipts that landed at firms or the treasury into household demand.
 * The household channel already blends inside the deposit credit. A zero
 * spendNewMoney weight leaves these channels unblended.
 */
function blendChannelReceipts(economy: Economy, amount: number): void {
  if (economy.params.trendWeight >= 1 || amount <= 0 || economy.households.length === 0) {
    return;
  }
  const forced = clamp(economy.params.spendNewMoney, 0, 1);
  if (forced <= 0) {
    return;
  }
  const incomes = economy.households.map((household) => Math.max(0, household.income));
  const weights = incomes.some((income) => income > 0) ? incomes : economy.households.map(() => 1);
  const parts = splitProportional(moneyAmount(economy, amount * forced), weights);
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = economy.households[index];
    const share = parts[index] ?? 0;
    if (household && share > 0) {
      household.smoothed = Math.max(0, household.smoothed + share);
    }
  }
}

function reserveStock(economy: Economy): number {
  return economy.banks.reduce((sum, bank) => sum + Math.max(0, bank.reserves), 0);
}

/** Take reserves from banks in id order. No bank's reserves go negative. */
function releaseReserves(economy: Economy, amount: number): void {
  let left = amount;
  for (const bank of economy.banks) {
    if (left <= 0) {
      return;
    }
    const take = Math.min(Math.max(0, bank.reserves), left);
    bank.reserves -= take;
    left -= take;
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
  if (economy.params.trendWeight >= 1 || flow <= 0 || household.income <= 0) {
    return;
  }
  const forced = clamp(economy.params.spendNewMoney, 0, 1);
  if (forced <= 0 && economy.params.openingDepositMonths >= THIN_OPENING_MONTHS) {
    return;
  }
  const buffer = household.income * DEPOSIT_BUFFER_MONTHS;
  const shortfall = clamp((buffer - household.deposit) / buffer, 0, 1);
  const weight = Math.max(forced, shortfall);
  household.smoothed = Math.max(0, household.smoothed + flow * weight);
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
  publishRate(economy, fiat * taylor + (1 - fiat) * market);
}

function setMarketRate(economy: Economy): void {
  publishRate(
    economy,
    marketLoanRate({
      timePrefMean: economy.params.timePrefMean,
      loans: totalLoans(economy),
      savings: savingsStock(economy),
    }),
  );
}

function supportInsolventBanks(economy: Economy): void {
  markLenderOfLastResort(economy);
  for (const bank of economy.banks) {
    if (bank.equity < 0) {
      injectBankCapital(bank, economy, -bank.equity + 1);
    }
  }
}

function setFiatPolicy(economy: Economy): void {
  publishRate(
    economy,
    taylorRate({
      timePrefMean: economy.params.timePrefMean,
      inflation: expectedInflation(economy),
      inflationTarget: economy.params.inflationTarget,
      inflationWeight: economy.params.inflationWeight,
      outputWeight: economy.params.outputWeight,
      outputGap: outputGap(economy),
    }),
  );
}

/** Last month’s rate keeps `rateSmoothing` of its weight. The rest is the new setting. */
function publishRate(economy: Economy, raw: number): void {
  const weight = clamp(economy.params.rateSmoothing, 0, 0.95);
  const setting = Math.max(0, raw);
  economy.policyRate = weight * economy.policyRate + (1 - weight) * setting;
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
}

function accommodateReserves(economy: Economy): void {
  const required = Math.round(economy.params.reserveRequirement * totalDeposits(economy));
  // Reserve interest already added reserves this tick. Ignore that slice so the
  // requirement still tops up the same lending gap as before the interest credit.
  const reserves =
    economy.banks.reduce((sum, bank) => sum + bank.reserves, 0) - economy.reserveInterestPaid;
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
