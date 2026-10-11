import { bankCreditRoom, equityFor, loansAt, totalLoans } from './banking.js';
import type { Economy } from './economy.js';
import {
  deflationPenalty,
  expectedInflation,
  moneyAmount,
  referenceWorkersPerFirm,
} from './helpers.js';
import { repayChannelLoans } from './central-bank.js';
import { payHouseholdDepositInterest } from './deposit-interest.js';
import { rateTransmissionFactor } from './contracts.js';
import { drawFirmLoan, payFirmInterest, releaseBankEquity, repayFirmLoan } from './money.js';
import { resolveInsolventBanks } from './resolution.js';
import {
  CREDIT_IMPULSE_DRAW,
  DEFLATION_REPAY_RATE,
  ENDOGENOUS_DRAW,
  ENDOGENOUS_LEVERAGE_START,
  ENDOGENOUS_STRESS_LIMIT,
  LOAN_SPREAD,
  MONTHLY_DEPRECIATION,
  RETAINED_INVESTMENT_SHARE,
} from './rules.js';
import { clamp } from './stats.js';
import type { Bank, Firm } from './types.js';

/**
 * Capital target: reference staffing times productivity and the AI factor.
 * Uses L*, not current headcount, so displacement does not shrink the stock.
 * Credit impulses raise the target. Equity claims use a valuation multiplier
 * on this capital stock.
 */
export function desiredCapital(economy: Economy): number {
  return Math.max(
    1,
    referenceWorkersPerFirm(economy) *
      economy.productivity *
      economy.aiFactor *
      (1 + Math.max(0, economy.creditImpulse)),
  );
}

/** True when expected capital return clears the real return on money plus the premium. */
export function clearsInvestmentHurdle(input: {
  expectedReturn: number;
  realReturn: number;
  premium: number;
}): boolean {
  return input.expectedReturn >= input.realReturn + input.premium;
}

/**
 * Capital installed this month, and how that gap is classed when the hurdle is on.
 * A miss installs a quarter of the gap and records the rest as profit-sharing finance.
 */
export function hurdleInvestment(
  gap: number,
  clears: boolean,
): { installed: number; loanPath: number; profitSharing: number } {
  if (!(gap > 0)) {
    return { installed: 0, loanPath: 0, profitSharing: 0 };
  }
  if (clears) {
    return { installed: gap, loanPath: gap, profitSharing: 0 };
  }
  const installed = gap * RETAINED_INVESTMENT_SHARE;
  return { installed, loanPath: 0, profitSharing: gap - installed };
}

/** Next stress stock from leverage above the calm threshold and loan losses. */
export function creditStressNext(input: {
  stress: number;
  leverage: number;
  lossRate: number;
  leverageStart?: number;
}): number {
  const start = input.leverageStart ?? ENDOGENOUS_LEVERAGE_START;
  const pressure = input.lossRate + Math.max(0, input.leverage - start);
  return clamp(0.9 * input.stress + pressure, 0, 2);
}

/** New borrowing while endogenous credit is calm, as a share of household deposits. */
export function endogenousBorrowing(input: {
  weight: number;
  stress: number;
  deposits: number;
}): number {
  if (input.weight <= 0 || input.stress > ENDOGENOUS_STRESS_LIMIT) {
    return 0;
  }
  return input.weight * ENDOGENOUS_DRAW * Math.max(0, input.deposits);
}

export function onCredit(economy: Economy): void {
  repayChannelLoans();
  resolveInsolventBanks(economy);
  economy.investmentSpend = 0;
  economy.realInvestment = 0;
  economy.interestPaid = 0;
  economy.loanFinance = 0;
  economy.profitSharingFinance = 0;
  if (economy.params.endogenousWeight > 0) {
    refreshCreditStress(economy);
    repayStressedLoans(economy);
    if (economy.tick > 0 && economy.tick % 12 === 0) {
      drawEndogenousCredit(economy);
    }
  }
  const realReturn = economy.paidDepositRate - expectedInflation(economy);
  const expectedReturn = economy.params.prodGrowth + economy.params.markup * 0.25;
  const borrowerInterest = new Map<number, number>();
  for (const firm of economy.firms) {
    const bank = economy.banks[firm.bank];
    repayDeflatingLoan(economy, firm);
    const interest = payInterest(economy, firm, bank);
    if (bank && interest > 0) {
      borrowerInterest.set(bank.id, (borrowerInterest.get(bank.id) ?? 0) + interest);
    }
    invest(economy, firm, bank, expectedReturn, realReturn);
  }
  for (const [bankId, interest] of economy.mortgageInterest) {
    borrowerInterest.set(bankId, (borrowerInterest.get(bankId) ?? 0) + interest);
  }
  payHouseholdDepositInterest(economy, borrowerInterest);
  for (const bank of economy.banks) {
    payDividend(economy, bank);
  }
}

function householdDeposits(economy: Economy): number {
  return economy.households.reduce((sum, household) => sum + Math.max(0, household.deposit), 0);
}

function refreshCreditStress(economy: Economy): void {
  const loans = totalLoans(economy);
  const deposits = Math.max(1, householdDeposits(economy));
  const lossRate = loans > 0 ? economy.defaultsThisTick / loans : 0;
  economy.creditStress = creditStressNext({
    stress: economy.creditStress,
    leverage: loans / deposits,
    lossRate,
    leverageStart: economy.params.leverageStart,
  });
}

function repayStressedLoans(economy: Economy): void {
  if (economy.creditStress <= ENDOGENOUS_STRESS_LIMIT) {
    return;
  }
  const fraction = clamp(economy.params.endogenousWeight * economy.creditStress, 0, 0.5);
  for (const firm of economy.firms) {
    const repay = Math.min(firm.loan, firm.deposit, moneyAmount(economy, firm.loan * fraction));
    if (repay <= 0) {
      continue;
    }
    repayFirmLoan(firm, repay);
    economy.loanRepaid += repay;
  }
}

/** New firm credit cannot push the loan above the capital value. */
function loanHeadroom(firm: Firm): number {
  return Math.max(0, Math.round(firm.capital * firm.price - firm.loan));
}

function drawEndogenousCredit(economy: Economy): void {
  const wanted = endogenousBorrowing({
    weight: economy.params.endogenousWeight,
    stress: economy.creditStress,
    deposits: householdDeposits(economy),
  });
  if (wanted <= 0 || economy.firms.length === 0) {
    return;
  }
  const share = wanted / economy.firms.length;
  for (const firm of economy.firms) {
    const bank = economy.banks[firm.bank];
    if (!bank || bank.failed) {
      continue;
    }
    const room = bankCreditRoom(economy, firm.bank);
    const borrowed = Math.min(
      moneyAmount(economy, share),
      Math.max(0, Math.round(room)),
      loanHeadroom(firm),
    );
    if (borrowed <= 0) {
      continue;
    }
    drawFirmLoan(firm, borrowed);
    economy.newBorrowing += borrowed;
  }
}

function repayDeflatingLoan(economy: Economy, firm: Firm): void {
  const penalty = deflationPenalty(economy);
  if (penalty <= 0 || firm.loan <= 0 || firm.deposit <= 0) {
    return;
  }
  const rawRepay = firm.loan * penalty * DEFLATION_REPAY_RATE;
  const repay = Math.min(firm.loan, firm.deposit, moneyAmount(economy, rawRepay));
  if (repay <= 0) {
    return;
  }
  repayFirmLoan(firm, repay);
  economy.loanRepaid += repay;
}

function payInterest(economy: Economy, firm: Firm, bank: Bank | undefined): number {
  const rawInterest = (firm.loan * (economy.policyRate + LOAN_SPREAD)) / 12;
  const interest = moneyAmount(economy, rawInterest);
  if (interest <= 0 || firm.deposit < interest || !bank || bank.failed) {
    return 0;
  }
  payFirmInterest(firm, bank, economy, interest);
  economy.interestPaid += interest;
  return interest;
}

function invest(
  economy: Economy,
  firm: Firm,
  bank: Bank | undefined,
  expectedReturn: number,
  realReturn: number,
): void {
  const desired = desiredCapital(economy);
  const gap = Math.max(0, desired - firm.capital);
  // In calm months, replace depreciation and spread larger catch-up over the
  // year so wealth does not sawtooth. A credit impulse still installs the full
  // gap that month.
  const monthInstall =
    economy.creditImpulse > 0
      ? gap
      : Math.min(gap, Math.max(firm.capital * MONTHLY_DEPRECIATION, gap / 12));
  const transmission = rateTransmissionFactor(economy);
  const hurdleOn = economy.params.investmentHurdle === 'on';
  const clears =
    !hurdleOn ||
    clearsInvestmentHurdle({
      expectedReturn,
      realReturn,
      premium: economy.params.hurdlePremium,
    });
  // Borrowing still only opens during a credit impulse, and only toward a
  // headcount-scale target so AI-driven capital does not create a loan boom.
  if (clears && economy.creditImpulse > 0 && bank && !bank.failed) {
    const borrowTarget = Math.max(
      1,
      firm.workers.length * (1 + Math.max(0, economy.creditImpulse)),
    );
    drawExpansionLoan(economy, firm, Math.max(0, borrowTarget - firm.capital) * transmission);
  }
  const decision = hurdleInvestment(monthInstall * transmission, clears);
  firm.capital += decision.installed;
  economy.realInvestment += decision.installed;
  economy.investmentSpend += decision.installed * firm.price;
  if (!hurdleOn) {
    return;
  }
  economy.loanFinance += decision.loanPath * firm.price;
  economy.profitSharingFinance += decision.profitSharing * firm.price;
}

function drawExpansionLoan(economy: Economy, firm: Firm, gap: number): void {
  const room = bankCreditRoom(economy, firm.bank);
  const wanted = Math.round(
    firm.loan * economy.creditImpulse * CREDIT_IMPULSE_DRAW + gap * firm.price,
  );
  const borrowed = Math.min(wanted, Math.max(0, Math.round(room)));
  if (borrowed <= 0) {
    return;
  }
  drawFirmLoan(firm, borrowed);
  economy.newBorrowing += borrowed;
}

function payDividend(economy: Economy, bank: Bank | undefined): void {
  if (!bank || bank.failed) {
    return;
  }
  const target = equityFor(economy, loansAt(economy, bank.id));
  if (bank.equity <= target) {
    return;
  }
  releaseBankEquity(bank, economy, Math.round(bank.equity - target));
}
