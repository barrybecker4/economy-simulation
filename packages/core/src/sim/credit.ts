import { bankCreditRoom, equityFor, loansAt } from './banking.js';
import type { Economy } from './economy.js';
import { deflationPenalty, inflation, moneyAmount } from './helpers.js';
import { drawFirmLoan, payFirmInterest, releaseBankEquity, repayFirmLoan } from './money.js';
import {
  CREDIT_IMPULSE_DRAW,
  DEFLATION_REPAY_RATE,
  LOAN_SPREAD,
  RETAINED_INVESTMENT_SHARE,
} from './rules.js';
import type { Bank, Firm } from './types.js';

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

export function onCredit(economy: Economy): void {
  economy.investmentSpend = 0;
  economy.realInvestment = 0;
  economy.interestPaid = 0;
  economy.loanFinance = 0;
  economy.profitSharingFinance = 0;
  const realReturn = economy.depositRate - inflation(economy);
  const expectedReturn = economy.params.prodGrowth + economy.params.markup * 0.25;
  for (const firm of economy.firms) {
    const bank = economy.banks[firm.bank];
    repayDeflatingLoan(economy, firm);
    payInterest(economy, firm, bank);
    invest(economy, firm, bank, expectedReturn, realReturn);
    payDividend(economy, bank);
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

function payInterest(economy: Economy, firm: Firm, bank: Bank | undefined): void {
  const rawInterest = (firm.loan * (economy.policyRate + LOAN_SPREAD)) / 12;
  const interest = moneyAmount(economy, rawInterest);
  if (interest <= 0 || firm.deposit < interest || !bank || bank.failed) {
    return;
  }
  payFirmInterest(firm, bank, economy, interest);
  economy.interestPaid += interest;
}

function invest(
  economy: Economy,
  firm: Firm,
  bank: Bank | undefined,
  expectedReturn: number,
  realReturn: number,
): void {
  const lumpy = economy.tick % 12 === 0 || economy.creditImpulse > 0;
  if (!lumpy) {
    return;
  }
  const desired = Math.max(1, firm.workers.length * (1 + Math.max(0, economy.creditImpulse)));
  const gap = Math.max(0, desired - firm.capital);
  const hurdleOn = economy.params.investmentHurdle === 'on';
  const clears =
    !hurdleOn ||
    clearsInvestmentHurdle({
      expectedReturn,
      realReturn,
      premium: economy.params.hurdlePremium,
    });
  if (clears && economy.creditImpulse > 0 && bank && !bank.failed) {
    drawExpansionLoan(economy, firm, gap);
  }
  const decision = hurdleInvestment(gap, clears);
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
