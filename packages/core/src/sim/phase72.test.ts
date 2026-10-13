import { describe, expect, it } from 'vitest';
import {
  affordableMortgageTermYears,
  monthlyMortgagePayment,
  monthlyOwnedCost,
  tenureFromBurdens,
  tenureRealLoanRate,
} from './contracts.js';

describe('phase 72 mortgage user cost once', () => {
  it('keeps bitcoin tenure real rates from adding deflation on top of a real market rate', () => {
    expect(tenureRealLoanRate(0.04, -0.02, 'bitcoin')).toBeCloseTo(0.06, 8);
    expect(tenureRealLoanRate(0.06, 0.02, 'fiat')).toBeCloseTo(0.06, 8);
    expect(tenureRealLoanRate(0.06, 0.02, 'hybrid')).toBeCloseTo(0.06, 8);
  });

  it('makes a long mortgage lose to rent under eight percent expected deflation with the real rate alone', () => {
    const homePrice = 48_000;
    const loan = homePrice * 0.8;
    const down = homePrice * 0.2;
    const loanRate = 0.04;
    const inflation = -0.08;
    const realRate = loanRate - inflation;
    const rent = homePrice * 0.007;
    const mortgage = monthlyMortgagePayment(loan, realRate, 30) + monthlyOwnedCost(down, realRate);
    const owned = monthlyOwnedCost(homePrice, realRate);
    expect(tenureFromBurdens({ rent, mortgage, owned })).toBe('rent');
  });

  it('checks affordability against current income, not deflated income', () => {
    const underDeflation = affordableMortgageTermYears({
      principal: 38_400,
      loanRate: 0.06,
      income: 1_000,
      defaultShare: 0.3,
      expectedInflation: -0.08,
      maxTermYears: 30,
    });
    const underInflation = affordableMortgageTermYears({
      principal: 38_400,
      loanRate: 0.06,
      income: 1_000,
      defaultShare: 0.3,
      expectedInflation: 0.08,
      maxTermYears: 30,
    });
    expect(underDeflation).toBe(30);
    expect(underInflation).toBe(30);
  });

  it('still refuses a loan whose nominal payment exceeds the income share', () => {
    expect(
      affordableMortgageTermYears({
        principal: 38_400,
        loanRate: 0.06,
        income: 100,
        defaultShare: 0.3,
        maxTermYears: 30,
      }),
    ).toBe(0);
  });
});
