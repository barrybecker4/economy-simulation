import { splitProportional } from './allocate.js';
import {
  addBonds,
  bankCreditRoom,
  bondNumber,
  savingsStock,
  totalDeposits,
  totalLoans,
} from './banking.js';
import type { Economy } from './economy.js';
import {
  expectedInflation,
  inflation,
  moneyAmount,
  naturalUnemployment,
  outputGap,
  unemploymentRate,
} from './helpers.js';
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
import {
  DEPOSIT_BUFFER_MONTHS,
  LOAN_SPREAD,
  MAX_POLICY_RATE,
  THIN_OPENING_MONTHS,
} from './rules.js';
import { clamp } from './stats.js';
import type { Firm } from './types.js';

/** Taylor-style fiat policy rate, floored at 0 and capped at MAX_POLICY_RATE. */
export function taylorRate(input: {
  timePrefMean: number;
  inflation: number;
  inflationTarget: number;
  inflationWeight: number;
  outputWeight: number;
  outputGap: number;
}): number {
  return clamp(
    input.timePrefMean +
      input.inflation +
      input.inflationWeight * (input.inflation - input.inflationTarget) +
      input.outputWeight * input.outputGap,
    0,
    MAX_POLICY_RATE,
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
  economy.zombieBudget = 0;
  economy.fiatInjectionFlow = 0;
  economy.reserveAccommodationFlow = 0;
  // Currency shares may move with choiceSpeed; the policy rule follows the regime.
  updateMoneyChoice(economy);
  if (economy.params.regime === 'fiat') {
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
 * Grow or shrink fiat broad money toward the inflation target plus productivity,
 * plus lagging crisis stimulus from the observed unemployment gap. The injection
 * channel chooses the offsetting stock. A contraction withdraws from that same
 * sector, and only up to the balances that exist.
 */
export function growFiatMoney(economy: Economy): void {
  if (economy.params.regime !== 'fiat' || economy.params.moneyGrowth <= 0) {
    return;
  }
  const trailing = inflation(economy);
  const secular =
    economy.params.moneyGrowth *
    (economy.params.inflationTarget +
      economy.params.prodGrowth +
      (economy.params.inflationTarget - trailing));
  const pressure = stimulusPressure(economy);
  economy.contractionPressure.push(pressure);
  const lagged = laggedStimulusPressure(economy);
  // Hard stop at the money cap. Full strength until fade start, then linear
  // fade so secular growth does not eat stimulus headroom before it can act.
  const moneyMultiple =
    economy.openingDeposits > 0 ? totalDeposits(economy) / economy.openingDeposits : 1;
  const stimulusEffective = lagged > 0 ? stimulusMoneyFade(moneyMultiple) : 1;
  const stimulusAnnual = economy.params.stimulus * lagged * stimulusEffective;
  const annual = secular + stimulusAnnual;
  const monthly = annual / 12;
  const deposits = totalDeposits(economy);
  if (deposits <= 0) {
    return;
  }
  const raw = deposits * monthly;
  const capped = clamp(raw, -0.05 * deposits, 0.05 * deposits);
  // Crisis-stimulus share of the capped positive injection, times zombie support.
  // Secular growth is not part of the budget. Cap binding scales the share.
  if (capped > 0 && annual > 0 && stimulusAnnual > 0 && economy.params.zombieSupport > 0) {
    const stimulusShare = stimulusAnnual / annual;
    economy.zombieBudget = moneyAmount(
      economy,
      capped * stimulusShare * economy.params.zombieSupport,
    );
  }
  // Reserve interest and the deposit-interest subsidy were already created this
  // tick inside the growth budget. Net them out so the annual path still holds.
  const amount = moneyAmount(economy, capped) - economy.reserveInterestPaid;
  if (amount === 0) {
    return;
  }
  if (amount > 0) {
    economy.fiatInjectionFlow = placeInjection(economy, amount);
    return;
  }
  const removed = withdrawInjection(economy, -amount);
  economy.fiatInjectionFlow = -removed;
}

/** Ignore unemployment gaps inside this band so calm noise does not move stimulus. */
const STIMULUS_GAP_DEADBAND = 0.02;
/** Broad-money multiple below which positive crisis stimulus stays at full strength. */
const STIMULUS_FADE_START = 2;
/** Broad-money multiple of opening deposits at which positive crisis stimulus stops. */
const STIMULUS_MONEY_CAP = 3;

/** Linear fade of positive stimulus between fade start and the hard money cap. */
export function stimulusMoneyFade(moneyMultiple: number): number {
  if (moneyMultiple >= STIMULUS_MONEY_CAP) {
    return 0;
  }
  if (moneyMultiple <= STIMULUS_FADE_START) {
    return 1;
  }
  return clamp(
    (STIMULUS_MONEY_CAP - moneyMultiple) / (STIMULUS_MONEY_CAP - STIMULUS_FADE_START),
    0,
    1,
  );
}

/**
 * Unemployment gap for the stimulus lag queue. Returns positive slack
 * (unemployment above natural rate) or zero. Never returns negative values,
 * so stimulus helps in slumps without withdrawing in tight labor markets.
 * Gaps inside two points are treated as zero.
 */
export function stimulusPressure(economy: Economy): number {
  const gap = unemploymentRate(economy) - naturalUnemployment(economy);
  if (gap < STIMULUS_GAP_DEADBAND) {
    return 0;
  }
  return gap;
}

/** @deprecated Use stimulusPressure. Kept for older phase imports. */
export function contractionPressure(economy: Economy): number {
  return Math.max(0, stimulusPressure(economy));
}

function laggedStimulusPressure(economy: Economy): number {
  const lag = Math.max(1, economy.params.stimulusLag);
  const index = economy.contractionPressure.length - 1 - lag;
  if (index < 0) {
    return 0;
  }
  return economy.contractionPressure[index] ?? 0;
}

/** Book one positive injection on the economy's channel. Returns the amount placed. */
export function placeInjection(economy: Economy, amount: number): number {
  if (amount <= 0) {
    return 0;
  }
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Fiat money growth needs a bank');
  }
  const channel = economy.params.injectionChannel;
  if (channel === 'governmentSpending') {
    creditTreasury(economy, amount);
    addReserves(bank, amount);
    const spent = spendTreasuryOnInventory(economy, amount);
    blendChannelReceipts(economy, spent);
    return amount;
  }
  if (channel === 'newLoans') {
    const booked = bookFirmLoans(economy, amount);
    economy.channelLoans += booked;
    blendChannelReceipts(economy, booked);
    return booked;
  }
  if (channel === 'assetPurchase') {
    const bought = buyExistingBonds(economy, amount);
    blendChannelReceipts(economy, bought);
    return bought;
  }
  injectHouseholdDeposits(economy, amount);
  addReserves(bank, amount);
  return amount;
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
  const roomByFirm = economy.firms.map((firm) => Math.max(0, bankCreditRoom(economy, firm.bank)));
  const capacity = roomByFirm.reduce((sum, room) => sum + room, 0);
  const target = Math.min(amount, capacity);
  if (target <= 0) {
    return 0;
  }
  const parts = splitProportional(target, roomByFirm);
  let booked = 0;
  for (let index = 0; index < economy.firms.length; index += 1) {
    const firm = economy.firms[index];
    const share = parts[index] ?? 0;
    if (firm && share > 0) {
      const take = Math.min(share, Math.max(0, bankCreditRoom(economy, firm.bank)));
      if (take > 0) {
        drawFirmLoan(firm, take);
        booked += take;
      }
    }
  }
  return booked;
}

/**
 * Injection loans retire on the ordinary repayment path. Kept as a no-op so
 * older call sites still compile; contractions use withdrawInjection.
 */
export function repayChannelLoans(_economy: Economy): void {
  // Intentionally empty: newLoans injections are real loans, not same-tick gifts.
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
  // Purchase booked −bonds +reserves +vault +deposits; reverse only from
  // reserves above the requirement so accommodation is not immediately undone.
  const capacity = Math.min(amount, excessReserveStock(economy), vaultResidual(economy));
  const removed = drainHouseholdDeposits(economy, capacity);
  releaseReserves(economy, removed);
  releaseVaultResidual(economy, removed);
  // Restore bonds on the first bank so a contraction reverses the purchase.
  const bank = economy.banks[0];
  if (bank && removed > 0) {
    addBonds(bank, removed);
  }
  return removed;
}

/** Reserves above the reserve requirement. Required balances stay untouched. */
function excessReserveStock(economy: Economy): number {
  const required = Math.round(economy.params.reserveRequirement * totalDeposits(economy));
  return Math.max(0, reserveStock(economy) - required);
}

/**
 * Spend treasury cash on firm inventory, starting with the fullest stock.
 * Returns the amount spent. Unspent credit stays in the treasury.
 */
export function spendTreasuryOnInventory(economy: Economy, amount: number): number {
  let left = Math.min(amount, Math.max(0, economy.govDeposits));
  const spentAtStart = left;
  const byStock = [...economy.firms].sort((a, b) => b.inventory - a.inventory);
  for (const firm of byStock) {
    left = buyFirmInventory(economy, firm, left);
  }
  const spent = spentAtStart - left;
  economy.govGoodsSpend += spent;
  return spent;
}

function buyFirmInventory(economy: Economy, firm: Firm, remaining: number): number {
  if (remaining <= 0 || firm.inventory <= 0 || firm.price <= 0) {
    return remaining;
  }
  const units = Math.min(firm.inventory, remaining / firm.price);
  const bill = Math.min(remaining, Math.round(units * firm.price));
  if (bill <= 0) {
    return remaining;
  }
  payFromTreasury(firm, economy, bill);
  firm.inventory -= bill / firm.price;
  firm.sales += bill / firm.price;
  return remaining - bill;
}

/**
 * Buy bonds already on bank books. Retires the bond asset, pays households, and
 * adds one reserve leg to match the new deposits. The retired bond seats on
 * vault cash and the private-equity residual so books close without a second
 * interest-bearing reserve. Places nothing when no bonds are available.
 */
function buyExistingBonds(economy: Economy, amount: number): number {
  let left = amount;
  let bought = 0;
  for (const bank of economy.banks) {
    if (left <= 0) {
      break;
    }
    const available = bondNumber(bank);
    const take = available <= 0 ? 0 : Math.min(left, available);
    if (take <= 0) {
      continue;
    }
    addBonds(bank, -take);
    addReserves(bank, take);
    bank.vault += take;
    economy.privateEquity += take;
    injectHouseholdDeposits(economy, take);
    bought += take;
    left -= take;
  }
  return bought;
}

/** Vault cash held as the private-equity residual (vault − bank equity). */
function vaultResidual(economy: Economy): number {
  return Math.max(0, economy.privateEquity);
}

/** Take vault residual from banks in id order. Keeps vault = equity + privateEquity. */
function releaseVaultResidual(economy: Economy, amount: number): void {
  let left = amount;
  for (const bank of economy.banks) {
    if (left <= 0) {
      return;
    }
    const take = Math.min(Math.max(0, bank.vault - bank.equity), left);
    bank.vault -= take;
    economy.privateEquity -= take;
    left -= take;
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
  economy.reserveAccommodationFlow += gap;
}
