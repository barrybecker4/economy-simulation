import { LOAN_SPREAD } from './rules.js';
import type { Economy } from './economy.js';
import {
  deflationPenalty,
  equityFor,
  inflation,
  lendingRoom,
  loansAt,
  moneyAmount,
  savingsRoom,
} from './helpers.js';

/** True when expected capital return clears the real return on money plus the premium. */
export function clearsInvestmentHurdle(input: {
  expectedReturn: number;
  realReturn: number;
  premium: number;
}): boolean {
  return input.expectedReturn >= input.realReturn + input.premium;
}

export function onCredit(economy: Economy): void {
  economy.investmentSpend = 0;
  economy.realInvestment = 0;
  economy.interestPaid = 0;
  economy.loanFinance = 0;
  economy.profitSharingFinance = 0;
  // newBorrowing and loanRepaid may already include household flows from contract choice.
  const realReturn = economy.depositRate - inflation(economy);
  // Markup is a price margin, not an annual return. Use productivity growth plus a
  // quarter of the markup as the expected real return on a capital project.
  const expectedReturn = economy.params.prodGrowth + economy.params.markup * 0.25;
  for (const firm of economy.firms) {
    const bank = economy.banks[firm.bank];
    const rawInterest = (firm.loan * (economy.policyRate + LOAN_SPREAD)) / 12;
    const interest = moneyAmount(economy, rawInterest);
    const penalty = deflationPenalty(economy);
    if (penalty > 0 && firm.loan > 0 && firm.deposit > 0) {
      const rawRepay = firm.loan * penalty * 0.02;
      const repay = Math.min(firm.loan, firm.deposit, moneyAmount(economy, rawRepay));
      if (repay > 0) {
        firm.loan -= repay;
        firm.deposit -= repay;
        economy.loanRepaid += repay;
      }
    }
    if (interest > 0 && firm.deposit >= interest && bank && !bank.failed) {
      firm.deposit -= interest;
      bank.equity += interest;
      economy.privateEquity -= interest;
      economy.interestPaid += interest;
    }
    const desired = Math.max(1, firm.workers.length * (1 + Math.max(0, economy.creditImpulse)));
    const lumpy = economy.tick % 12 === 0 || economy.creditImpulse > 0;
    if (lumpy) {
      const gap = Math.max(0, desired - firm.capital);
      const hurdleOn = economy.params.investmentHurdle === 'on';
      const clears =
        !hurdleOn ||
        clearsInvestmentHurdle({
          expectedReturn,
          realReturn,
          premium: economy.params.hurdlePremium,
        });
      if (clears) {
        if (economy.creditImpulse > 0 && bank && !bank.failed) {
          const room =
            economy.params.regime === 'fiat'
              ? lendingRoom(economy, bank.id, bank.equity)
              : Math.min(lendingRoom(economy, bank.id, bank.equity), savingsRoom(economy));
          const borrowed = Math.min(
            Math.round(firm.loan * economy.creditImpulse * 0.2 + gap * firm.price),
            Math.max(0, Math.round(room)),
          );
          if (borrowed > 0) {
            firm.loan += borrowed;
            firm.deposit += borrowed;
            economy.newBorrowing += borrowed;
            economy.loanFinance += borrowed;
          }
        }
        firm.capital += gap;
        economy.realInvestment += gap;
        economy.investmentSpend += gap * firm.price;
        if (hurdleOn) {
          economy.loanFinance += Math.max(0, gap * firm.price);
        }
      } else if (gap > 0) {
        // Below the hurdle: fund a smaller retained claim and skip loan-financed expansion.
        const retained = gap * 0.25;
        firm.capital += retained;
        economy.realInvestment += retained;
        economy.investmentSpend += retained * firm.price;
        economy.profitSharingFinance += gap * firm.price;
      }
    }
    if (bank && !bank.failed) {
      const target = equityFor(economy, loansAt(economy, bank.id));
      if (bank.equity > target) {
        const dividend = Math.round(bank.equity - target);
        bank.equity -= dividend;
        economy.privateEquity += dividend;
      }
    }
  }
}
